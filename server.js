const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pkg = require('./package.json');

const DEFAULT_PORT = 3000;
const MESSAGE_MAX_LENGTH = 140;
const REPORT_THRESHOLD = 3;
const ACCESS_COOKIE_NAME = 'echo_access';
const ACCESS_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ACCESS_SECRET_FILE = 'app-secret.key';
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/\S*)?\b/i;

function isDatabaseLike(value) {
  return Boolean(
    value
    && typeof value.exec === 'function'
    && typeof value.prepare === 'function'
  );
}

function parseTrustProxy(value) {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === 'off') {
    return false;
  }
  if (normalized === 'true' || normalized === 'on') {
    return true;
  }
  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  return value;
}

function createRateLimiter(config) {
  const map = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of map.entries()) {
      if (now - data.windowStart > config.window) {
        map.delete(ip);
      }
    }
  }, 60000);
  cleanup.unref?.();

  function middleware(req, res, next) {
    const ip = getClientIp(req);
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
      res.set('Retry-After', String(waitTime));
      return res.status(429).json({
        error: `Too many requests. Please wait ${waitTime} seconds.`
      });
    }

    data.count += 1;
    return next();
  }

  middleware.destroy = () => clearInterval(cleanup);
  return middleware;
}

function ensureDataDir(dataDir) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadOrCreateSecret(secretPath) {
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, secret, { mode: 0o600, flag: 'wx' });
    return secret;
  } catch (error) {
    if (error.code === 'EEXIST') {
      return fs.readFileSync(secretPath, 'utf8').trim();
    }
    throw error;
  }
}

function signValue(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createAccessToken(secret) {
  const payload = Buffer.from(JSON.stringify({
    issuedAt: Date.now(),
    version: 1
  }), 'utf8').toString('base64url');
  const signature = signValue(secret, payload);
  return `${payload}.${signature}`;
}

function verifyAccessToken(secret, token, maxAgeMs) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signValue(secret, payload);
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.issuedAt !== 'number') {
      return false;
    }
    return (Date.now() - data.issuedAt) <= maxAgeMs;
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  return parts.join('; ');
}

function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return '';
  }

  const value = ip.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('::ffff:')) {
    return value.slice(7);
  }

  return value;
}

function isPrivateOrReservedIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) {
    return true;
  }

  if (normalized === '::1') {
    return true;
  }

  if (normalized.includes(':')) {
    const lower = normalized.toLowerCase();
    return lower.startsWith('fc')
      || lower.startsWith('fd')
      || lower.startsWith('fe8')
      || lower.startsWith('fe9')
      || lower.startsWith('fea')
      || lower.startsWith('feb');
  }

  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return true;
  }

  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
}

function getClientIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

function extractCountry(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (typeof data.country === 'string' && data.country.trim()) {
    return data.country.trim();
  }
  if (typeof data.country_name === 'string' && data.country_name.trim()) {
    return data.country_name.trim();
  }

  return null;
}

function createCountryLookup(options) {
  const enabled = options.countryLookupEnabled;
  const urlTemplate = options.countryLookupUrlTemplate;
  const fetchImpl = options.fetchImpl || global.fetch;

  return async function getCountryFromIP(ip) {
    const normalizedIp = normalizeIp(ip);
    if (!enabled || !urlTemplate || !urlTemplate.startsWith('https://') || !fetchImpl) {
      return null;
    }

    if (!normalizedIp || isPrivateOrReservedIp(normalizedIp)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    timeout.unref?.();

    try {
      const response = await fetchImpl(
        urlTemplate.replace('{ip}', encodeURIComponent(normalizedIp)),
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        return null;
      }

      return extractCountry(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };
}

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      country TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.exec('ALTER TABLE messages ADD COLUMN country TEXT');
  } catch {
    // Migration already applied.
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

  try {
    db.exec('ALTER TABLE reports ADD COLUMN reporter_hash TEXT');
  } catch {
    // Migration already applied.
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_reports_message_id ON reports(message_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_reporter
    ON reports(message_id, reporter_hash)
    WHERE reporter_hash IS NOT NULL
  `);

  const stmts = {
    insertMessage: db.prepare('INSERT INTO messages (content, country) VALUES (?, ?)'),
    updateCountry: db.prepare('UPDATE messages SET country = ? WHERE id = ?'),
    getRandomMessage: db.prepare("SELECT id, content, country, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at FROM messages ORDER BY RANDOM() LIMIT 1"),
    getRandomMessageExcluding: db.prepare("SELECT id, content, country, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at FROM messages WHERE id NOT IN (SELECT value FROM json_each(?)) ORDER BY RANDOM() LIMIT 1"),
    countMessages: db.prepare('SELECT COUNT(*) as total FROM messages'),
    checkMessage: db.prepare('SELECT id FROM messages WHERE id = ?'),
    insertReport: db.prepare('INSERT INTO reports (message_id, reason, reporter_hash) VALUES (?, ?, ?)'),
    countReports: db.prepare('SELECT COUNT(*) as count FROM reports WHERE message_id = ?'),
    deleteReports: db.prepare('DELETE FROM reports WHERE message_id = ?'),
    deleteMessage: db.prepare('DELETE FROM messages WHERE id = ?'),
    healthCheck: db.prepare('SELECT 1'),
  };

  const autoModerate = db.transaction((messageId, reason, reporterHash) => {
    const message = stmts.checkMessage.get(messageId);
    if (!message) {
      return { notFound: true };
    }

    try {
      stmts.insertReport.run(messageId, reason, reporterHash);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { duplicate: true };
      }
      throw error;
    }

    const { count } = stmts.countReports.get(messageId);
    if (count >= REPORT_THRESHOLD) {
      stmts.deleteReports.run(messageId);
      stmts.deleteMessage.run(messageId);
      return { deleted: true, count };
    }

    return { deleted: false, count };
  });

  return { autoModerate, stmts };
}

function buildApp(options) {
  const {
    appSecret,
    countryLookupEnabled,
    countryLookupUrlTemplate,
    db,
    fetchImpl,
    secureCookies,
    trustProxy
  } = options;

  const { autoModerate, stmts } = initDb(db);
  const getCountryFromIP = createCountryLookup({
    countryLookupEnabled,
    countryLookupUrlTemplate,
    fetchImpl
  });
  const rateLimiterWrite = createRateLimiter({ window: 2 * 60 * 1000, max: 5 });
  const rateLimiterRead = createRateLimiter({ window: 60 * 1000, max: 30 });

  const app = express();
  app.set('trust proxy', trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' }
  }));

  app.disable('x-powered-by');
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
  }));

  function requireReceiveAccess(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[ACCESS_COOKIE_NAME];
    if (!verifyAccessToken(appSecret, token, ACCESS_TOKEN_MAX_AGE_MS)) {
      return res.status(403).json({
        error: 'Send a signal before receiving one.'
      });
    }

    return next();
  }

  app.post('/api/message', rateLimiterWrite, async (req, res) => {
    const { content } = req.body || {};

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (trimmedContent.length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ error: `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters` });
    }

    if (URL_PATTERN.test(trimmedContent)) {
      return res.status(400).json({ error: 'Links are not allowed in signals' });
    }

    try {
      const result = stmts.insertMessage.run(trimmedContent, null);
      const messageId = result.lastInsertRowid;
      const accessToken = createAccessToken(appSecret);

      res.setHeader('Set-Cookie', serializeCookie(ACCESS_COOKIE_NAME, accessToken, {
        httpOnly: true,
        maxAge: ACCESS_TOKEN_MAX_AGE_MS / 1000,
        path: '/',
        sameSite: 'Strict',
        secure: secureCookies
      }));

      res.status(201).json({
        success: true,
        id: messageId
      });

      const ip = getClientIp(req);
      getCountryFromIP(ip).then((country) => {
        if (country) {
          try {
            stmts.updateCountry.run(country, messageId);
          } catch {
            // Country enrichment is optional and should never break writes.
          }
        }
      }).catch(() => {});
    } catch (error) {
      console.error('Error saving message:', error);
      return res.status(500).json({ error: 'Error sending message' });
    }
  });

  app.post('/api/message/random', rateLimiterRead, requireReceiveAccess, (req, res) => {
    const { exclude = [] } = req.body || {};
    const excludeIds = Array.isArray(exclude)
      ? exclude.filter((id) => Number.isInteger(id) && id > 0).slice(0, 100)
      : [];

    try {
      const message = excludeIds.length > 0
        ? stmts.getRandomMessageExcluding.get(JSON.stringify(excludeIds))
        : stmts.getRandomMessage.get();

      if (!message) {
        const { total } = stmts.countMessages.get();
        if (total === 0) {
          return res.status(404).json({ error: 'No signals detected yet. Be the first to transmit.' });
        }
        return res.status(404).json({ error: 'You have seen all signals. Come back later for new transmissions.' });
      }

      return res.json({
        id: message.id,
        content: message.content,
        country: message.country,
        created_at: message.created_at
      });
    } catch (error) {
      console.error('Error fetching random message:', error);
      return res.status(500).json({ error: 'Error receiving signal' });
    }
  });

  app.post('/api/report', rateLimiterRead, (req, res) => {
    const { messageId, reason } = req.body || {};

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ error: 'Valid message ID is required' });
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : null;
    if (trimmedReason && trimmedReason.length > 500) {
      return res.status(400).json({ error: 'Report reason cannot exceed 500 characters' });
    }

    try {
      const reporterHash = signValue(appSecret, `reporter:${getClientIp(req)}`);
      const result = autoModerate(messageId, trimmedReason || null, reporterHash);

      if (result.notFound) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (result.duplicate) {
        return res.status(409).json({
          code: 'already_reported',
          error: 'You have already reported this signal.'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Report submitted. Thank you for helping keep the void safe.'
      });
    } catch (error) {
      console.error('Error saving report:', error);
      return res.status(500).json({ error: 'Error submitting report' });
    }
  });

  app.get('/api/version', (req, res) => {
    res.json({ version: pkg.version });
  });

  app.get('/api/stats', (req, res) => {
    try {
      const result = stmts.countMessages.get();
      return res.json({ total: result.total });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({ error: 'Error fetching statistics' });
    }
  });

  app.get('/health', (req, res) => {
    try {
      stmts.healthCheck.get();
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      });
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  function destroy() {
    rateLimiterWrite.destroy();
    rateLimiterRead.destroy();
  }

  return {
    ACCESS_COOKIE_NAME,
    app,
    destroy,
    stmts
  };
}

function createApp(input = {}, maybeOptions = {}) {
  const dbProvidedDirectly = isDatabaseLike(input);
  const options = dbProvidedDirectly ? maybeOptions : (input || {});
  const port = options.port ?? process.env.PORT ?? DEFAULT_PORT;
  const trustProxy = options.trustProxy ?? parseTrustProxy(process.env.TRUST_PROXY);
  const countryLookupEnabled = options.countryLookupEnabled
    ?? process.env.COUNTRY_LOOKUP_ENABLED === 'true';
  const countryLookupUrlTemplate = options.countryLookupUrlTemplate
    || process.env.COUNTRY_LOOKUP_URL_TEMPLATE
    || '';
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === 'production';

  let db = dbProvidedDirectly ? input : options.db;
  let dbPath = options.dbPath || null;
  let ownsDb = false;
  let appSecret = options.appSecret || null;

  if (!db) {
    const dataDir = options.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data');
    ensureDataDir(dataDir);
    dbPath = path.join(dataDir, 'messages.db');
    db = new Database(dbPath);
    ownsDb = true;

    if (!appSecret) {
      appSecret = loadOrCreateSecret(path.join(dataDir, ACCESS_SECRET_FILE));
    }
  }

  if (!appSecret) {
    appSecret = crypto.randomBytes(32).toString('hex');
  }

  const built = buildApp({
    appSecret,
    countryLookupEnabled,
    countryLookupUrlTemplate,
    db,
    fetchImpl: options.fetchImpl,
    secureCookies,
    trustProxy
  });

  let server = null;

  async function start(listenPort = port) {
    if (server) {
      return server;
    }

    server = await new Promise((resolve, reject) => {
      const instance = built.app.listen(listenPort, () => resolve(instance));
      instance.once('error', reject);
    });

    return server;
  }

  async function close() {
    built.destroy();

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }

    if (ownsDb) {
      try {
        db.close();
      } catch {
        // Ignore duplicate close attempts during shutdown.
      }
    }
  }

  return {
    ACCESS_COOKIE_NAME,
    app: built.app,
    close,
    db,
    dbPath,
    start,
    stmts: built.stmts
  };
}

async function main() {
  const instance = createApp();
  const server = await instance.start();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : DEFAULT_PORT;

  console.log(`Echo server listening on port ${port}`);
  console.log(`Database: ${instance.dbPath}`);

  async function shutdown() {
    const forceExit = setTimeout(() => process.exit(1), 5000);
    forceExit.unref?.();

    try {
      await instance.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  ACCESS_COOKIE_NAME,
  createApp,
  parseTrustProxy
};
