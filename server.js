const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // No unsafe-inline - JS is in external file
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,  // Allow fonts from Google
}));

// Disable X-Powered-By header (already done by helmet, but explicit)
app.disable('x-powered-by');

// Enable gzip compression for all responses
app.use(compression());

// Rate limiting configuration
const rateLimitConfigs = {
  write: { window: 2 * 60 * 1000, max: 5 },   // 5 per 2 min (send messages)
  read: { window: 60 * 1000, max: 30 },         // 30 per min (receive/report)
};
const rateLimitMaps = {
  write: new Map(),
  read: new Map(),
};

// Clean up old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [type, map] of Object.entries(rateLimitMaps)) {
    const window = rateLimitConfigs[type].window;
    for (const [ip, data] of map.entries()) {
      if (now - data.windowStart > window) {
        map.delete(ip);
      }
    }
  }
}, 60000);

// Rate limiter middleware factory
function createRateLimiter(type) {
  const config = rateLimitConfigs[type];
  const map = rateLimitMaps[type];

  return function(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!map.has(ip)) {
      map.set(ip, { count: 1, windowStart: now });
      return next();
    }

    const data = map.get(ip);

    if (now - data.windowStart > config.window) {
      map.set(ip, { count: 1, windowStart: now });
      return next();
    }

    if (data.count >= config.max) {
      const waitTime = Math.ceil((config.window - (now - data.windowStart)) / 1000);
      return res.status(429).json({
        error: `Too many requests. Please wait ${waitTime} seconds.`
      });
    }

    data.count++;
    next();
  };
}

const rateLimiterWrite = createRateLimiter('write');
const rateLimiterRead = createRateLimiter('read');

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dataDir, 'messages.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add country column if it doesn't exist (migration for existing databases)
try {
  db.exec('ALTER TABLE messages ADD COLUMN country TEXT');
} catch (e) {
  // Column already exists, ignore error
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )
`);

// Index for faster report lookups
db.exec('CREATE INDEX IF NOT EXISTS idx_reports_message_id ON reports(message_id)');

// Index for faster date-based queries
db.exec('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');

// Auto-moderation threshold
const REPORT_THRESHOLD = 3;

// Pre-compiled prepared statements for performance
const stmts = {
  insertMessage: db.prepare('INSERT INTO messages (content, country) VALUES (?, ?)'),
  getRandomMessage: db.prepare('SELECT id, content, country, created_at FROM messages LIMIT 1 OFFSET ?'),
  getRandomMessageExcluding: null, // Built dynamically due to variable IN clause
  countMessages: db.prepare('SELECT COUNT(*) as total FROM messages'),
  countMessagesExcluding: null, // Built dynamically
  checkMessage: db.prepare('SELECT id FROM messages WHERE id = ?'),
  insertReport: db.prepare('INSERT INTO reports (message_id, reason) VALUES (?, ?)'),
  countReports: db.prepare('SELECT COUNT(*) as count FROM reports WHERE message_id = ?'),
  deleteReports: db.prepare('DELETE FROM reports WHERE message_id = ?'),
  deleteMessage: db.prepare('DELETE FROM messages WHERE id = ?'),
  healthCheck: db.prepare('SELECT 1'),
};

// Atomic auto-moderation transaction
const autoModerate = db.transaction((messageId, reason) => {
  stmts.insertReport.run(messageId, reason);
  const { count } = stmts.countReports.get(messageId);
  if (count >= REPORT_THRESHOLD) {
    stmts.deleteReports.run(messageId);
    stmts.deleteMessage.run(messageId);
    console.log(`Auto-moderation: Message ${messageId} deleted (${count} reports)`);
    return { deleted: true, count };
  }
  return { deleted: false, count };
});

// Middleware
app.use(express.json({ limit: '10kb' }));  // Limit body size to prevent DoS
app.use(express.static('public', {
  maxAge: '1d',  // Cache static files for 1 day
  etag: true
}));

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// API Routes

// Helper function to get country from IP
async function getCountryFromIP(ip) {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    
    // Clean IP (remove ::ffff: prefix for IPv4-mapped IPv6)
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,country`);
    const data = await response.json();
    
    if (data.status === 'success' && data.country) {
      return data.country;
    }
    return null;
  } catch (error) {
    console.error('Error fetching country:', error);
    return null;
  }
}

// POST /api/message - Save a new message (with rate limiting)
app.post('/api/message', rateLimiterWrite, async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (trimmedContent.length > 140) {
    return res.status(400).json({ error: 'Message cannot exceed 140 characters' });
  }

  // Filter out URLs and links
  const urlPattern = /(https?:\/\/|www\.|\.com|\.net|\.org|\.io|\.co|\.app|\.dev|\.xyz|\.fr|\.de|\.uk|\.ru|\.cn|\.es|\.it|\.nl|\.be|\.ch|\.ca|\.au|\.info|\.biz|\.me|\.tv|\.cc|t\.me|bit\.ly|goo\.gl|tinyurl|shorturl)/i;
  if (urlPattern.test(trimmedContent)) {
    return res.status(400).json({ error: 'Links are not allowed in signals' });
  }

  try {
    // Insert message immediately without country (non-blocking)
    const result = stmts.insertMessage.run(trimmedContent, null);
    const messageId = result.lastInsertRowid;

    // Respond immediately for better UX
    res.status(201).json({
      success: true,
      id: messageId
    });

    // Update country in background (fire-and-forget, don't block response)
    const ip = req.ip || req.connection.remoteAddress;
    getCountryFromIP(ip).then(country => {
      if (country) {
        try {
          db.prepare('UPDATE messages SET country = ? WHERE id = ?').run(country, messageId);
        } catch (e) {
          // Silently ignore - country is optional
        }
      }
    }).catch(() => {}); // Ignore errors - country lookup is non-critical
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// POST /api/message/random - Get a random message (excluding already seen)
app.post('/api/message/random', rateLimiterRead, (req, res) => {
  const { exclude = [] } = req.body;

  // Validate exclude array
  const excludeIds = Array.isArray(exclude)
    ? exclude.filter(id => Number.isInteger(id) && id > 0)
    : [];

  try {
    let message;

    if (excludeIds.length > 0) {
      // Single query with ORDER BY RANDOM() - more efficient than COUNT + OFFSET
      const placeholders = excludeIds.map(() => '?').join(',');
      const selectStmt = db.prepare(`SELECT id, content, country, created_at FROM messages WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`);
      message = selectStmt.get(...excludeIds);

      if (!message) {
        const { total: allTotal } = stmts.countMessages.get();
        if (allTotal === 0) {
          return res.status(404).json({ error: 'No signals detected yet. Be the first to transmit.' });
        }
        return res.status(404).json({ error: 'You have seen all signals. Come back later for new transmissions.' });
      }
    } else {
      // Single query with ORDER BY RANDOM() for simplicity and consistency
      message = db.prepare('SELECT id, content, country, created_at FROM messages ORDER BY RANDOM() LIMIT 1').get();

      if (!message) {
        return res.status(404).json({ error: 'No signals detected yet. Be the first to transmit.' });
      }
    }

    if (!message) {
      return res.status(404).json({ error: 'Error receiving signal. Try again.' });
    }

    res.json({
      id: message.id,
      content: message.content,
      country: message.country,
      created_at: message.created_at
    });
  } catch (error) {
    console.error('Error fetching random message:', error);
    res.status(500).json({ error: 'Error receiving signal' });
  }
});

// POST /api/report - Report a message
app.post('/api/report', rateLimiterRead, (req, res) => {
  const { messageId, reason } = req.body;

  if (!messageId || !Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ error: 'Valid message ID is required' });
  }

  try {
    // Check if message exists
    const message = stmts.checkMessage.get(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Atomic: insert report + auto-moderate if threshold reached
    autoModerate(messageId, reason || null);

    res.status(201).json({
      success: true,
      message: 'Report submitted. Thank you for helping keep the void safe.'
    });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Error submitting report' });
  }
});

// GET /api/stats - Get total message count
app.get('/api/stats', (req, res) => {
  try {
    const result = stmts.countMessages.get();
    res.json({ total: result.total });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

// GET /health - Health check endpoint for container orchestration
app.get('/health', (req, res) => {
  try {
    // Check database connectivity
    stmts.healthCheck.get();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler - don't expose internal errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Echo server listening on port ${PORT}`);
  console.log(`📡 Database: ${dbPath}`);
});

// Graceful shutdown with timeout
function shutdown() {
  const forceExit = setTimeout(() => process.exit(1), 5000);
  forceExit.unref();
  try { db.close(); } catch (e) { /* ignore */ }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
