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
const RATE_LIMIT_WINDOW = 2 * 60 * 1000; // 2 minutes
const RATE_LIMIT_MAX = 5; // 5 messages per window
const rateLimitMap = new Map();

// Clean up old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

// Rate limiter middleware
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return next();
  }

  const data = rateLimitMap.get(ip);

  if (now - data.windowStart > RATE_LIMIT_WINDOW) {
    // Reset window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (data.count >= RATE_LIMIT_MAX) {
    const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - data.windowStart)) / 1000);
    return res.status(429).json({
      error: `Too many signals. Please wait ${waitTime} seconds before transmitting again.`
    });
  }

  data.count++;
  next();
}

// Ensure data directory exists
const dataDir = '/data';
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
app.post('/api/message', rateLimiter, async (req, res) => {
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

  try {
    // Get country from IP (async, don't block if it fails)
    const ip = req.ip || req.connection.remoteAddress;
    const country = await getCountryFromIP(ip);
    
    const stmt = db.prepare('INSERT INTO messages (content, country) VALUES (?, ?)');
    const result = stmt.run(trimmedContent, country);
    res.status(201).json({
      success: true,
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// POST /api/message/random - Get a random message (excluding already seen)
app.post('/api/message/random', (req, res) => {
  const { exclude = [] } = req.body;

  // Validate exclude array
  const excludeIds = Array.isArray(exclude)
    ? exclude.filter(id => Number.isInteger(id) && id > 0)
    : [];

  try {
    let query, params;

    if (excludeIds.length > 0) {
      const placeholders = excludeIds.map(() => '?').join(',');
      query = `SELECT id, content, country, created_at FROM messages WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`;
      params = excludeIds;
    } else {
      query = 'SELECT id, content, country, created_at FROM messages ORDER BY RANDOM() LIMIT 1';
      params = [];
    }

    const stmt = db.prepare(query);
    const message = stmt.get(...params);

    if (!message) {
      // Check if there are any messages at all
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM messages');
      const { total } = countStmt.get();

      if (total === 0) {
        return res.status(404).json({
          error: 'No signals detected yet. Be the first to transmit.'
        });
      } else {
        return res.status(404).json({
          error: 'You have seen all signals. Come back later for new transmissions.'
        });
      }
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

// Auto-moderation threshold
const REPORT_THRESHOLD = 3;

// POST /api/report - Report a message
app.post('/api/report', (req, res) => {
  const { messageId, reason } = req.body;

  if (!messageId || !Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ error: 'Valid message ID is required' });
  }

  try {
    // Check if message exists
    const checkStmt = db.prepare('SELECT id FROM messages WHERE id = ?');
    const message = checkStmt.get(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Insert report
    const insertStmt = db.prepare('INSERT INTO reports (message_id, reason) VALUES (?, ?)');
    insertStmt.run(messageId, reason || null);

    // Check report count for auto-moderation
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM reports WHERE message_id = ?');
    const { count } = countStmt.get(messageId);

    if (count >= REPORT_THRESHOLD) {
      // Auto-delete message and its reports
      const deleteReportsStmt = db.prepare('DELETE FROM reports WHERE message_id = ?');
      const deleteMessageStmt = db.prepare('DELETE FROM messages WHERE id = ?');
      deleteReportsStmt.run(messageId);
      deleteMessageStmt.run(messageId);
      console.log(`🛡️ Auto-moderation: Message ${messageId} deleted (${count} reports)`);
    }

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
    const stmt = db.prepare('SELECT COUNT(*) as total FROM messages');
    const result = stmt.get();
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
    const stmt = db.prepare('SELECT 1');
    stmt.get();
    
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

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
