const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const supertest = require('supertest');
const Database = require('better-sqlite3');

const { ACCESS_COOKIE_NAME, createApp } = require('../server');

function setup(options = {}) {
  const db = new Database(':memory:');
  const instance = createApp(db, {
    countryLookupEnabled: false,
    secureCookies: false,
    ...options
  });

  return {
    ...instance,
    request: supertest(instance.app)
  };
}

async function teardown(ctx) {
  await ctx.close();
  ctx.db.close();
}

function insertMessage(db, content, country = null) {
  return db.prepare('INSERT INTO messages (content, country) VALUES (?, ?)').run(content, country);
}

function extractCookie(setCookieHeader, name = ACCESS_COOKIE_NAME) {
  const raw = Array.isArray(setCookieHeader)
    ? setCookieHeader.join('; ')
    : (setCookieHeader || '');
  const match = raw.match(new RegExp(`${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : '';
}

async function createAccessCookie(ctx, content = 'Signal autorise') {
  const response = await ctx.request.post('/api/message').send({ content });
  assert.equal(response.status, 201);
  const cookie = extractCookie(response.headers['set-cookie']);
  assert.ok(cookie);
  return { cookie, response };
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'echo-test-'));
}

async function createStandaloneContext(options = {}) {
  const dataDir = createTempDir();
  const instance = createApp({
    countryLookupEnabled: false,
    dataDir,
    port: 0,
    secureCookies: false,
    ...options
  });
  const server = await instance.start();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    ...instance,
    baseUrl: `http://127.0.0.1:${port}`,
    async cleanup() {
      await instance.close();
      fs.rmSync(dataDir, { force: true, recursive: true });
    }
  };
}

describe('POST /api/message', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns 400 when content is missing', async () => {
    const res = await ctx.request.post('/api/message').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /content is required/i);
  });

  it('returns 400 when content is not a string', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 123 });
    assert.equal(res.status, 400);
  });

  it('returns 400 when content is empty or whitespace', async () => {
    const res = await ctx.request.post('/api/message').send({ content: '   ' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /empty/i);
  });

  it('returns 400 when content exceeds 140 characters', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'a'.repeat(141) });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /140/);
  });

  it('blocks protocol URLs', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'visit https://evil.com' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /link/i);
  });

  it('blocks www URLs', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'go to www.example.org' });
    assert.equal(res.status, 400);
  });

  it('blocks bare domains', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'viens sur example.ai ce soir' });
    assert.equal(res.status, 400);
  });

  it('blocks shorteners', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'click bit.ly/abc' });
    assert.equal(res.status, 400);
  });

  it('returns 201 with success for valid content', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'Hello void' });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.id);
  });

  it('trims whitespace from content', async () => {
    const res = await ctx.request.post('/api/message').send({ content: '  Hello  ' });
    assert.equal(res.status, 201);
    const row = ctx.db.prepare('SELECT content FROM messages WHERE id = ?').get(res.body.id);
    assert.equal(row.content, 'Hello');
  });

  it('sets a strict httpOnly access cookie', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'Cookie test' });
    const rawCookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'][0]
      : res.headers['set-cookie'];

    assert.equal(res.status, 201);
    assert.match(rawCookie, new RegExp(`${ACCESS_COOKIE_NAME}=`));
    assert.match(rawCookie, /HttpOnly/i);
    assert.match(rawCookie, /SameSite=Strict/i);
    assert.match(rawCookie, /Max-Age=/i);
  });
});

describe('POST /api/message/random', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns 403 without access cookie', async () => {
    const res = await ctx.request.post('/api/message/random').send({});
    assert.equal(res.status, 403);
    assert.match(res.body.error, /send a signal/i);
  });

  it('returns 404 with access cookie when there are no messages', async () => {
    const { cookie, response } = await createAccessCookie(ctx, 'Transient signal');
    ctx.db.prepare('DELETE FROM messages WHERE id = ?').run(response.body.id);

    const res = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({});

    assert.equal(res.status, 404);
    assert.match(res.body.error, /no signals/i);
  });

  it('returns a message when messages exist and access is granted', async () => {
    const { cookie } = await createAccessCookie(ctx, 'Hello from the void');

    const res = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.content, 'Hello from the void');
    assert.ok(res.body.id);
    assert.match(res.body.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.ok(!Number.isNaN(Date.parse(res.body.created_at)));
  });

  it('returns 404 when all messages are excluded', async () => {
    const { cookie, response } = await createAccessCookie(ctx, 'Only message');

    const res = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({ exclude: [response.body.id] });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /seen all signals/i);
  });

  it('filters out non-integer exclude values', async () => {
    const { cookie } = await createAccessCookie(ctx, 'Test message');

    const res = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({ exclude: ['abc', -1, 0, 1.5] });

    assert.equal(res.status, 200);
    assert.equal(res.body.content, 'Test message');
  });

  it('handles non-array exclude gracefully', async () => {
    const { cookie } = await createAccessCookie(ctx, 'Test message');

    const res = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({ exclude: 'not-an-array' });

    assert.equal(res.status, 200);
  });
});

describe('POST /api/report', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns 400 when messageId is missing', async () => {
    const res = await ctx.request.post('/api/report').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid message id/i);
  });

  it('returns 400 when messageId is not a positive integer', async () => {
    for (const bad of [0, -1, 'abc', 1.5]) {
      const res = await ctx.request.post('/api/report').send({ messageId: bad });
      assert.equal(res.status, 400, `Expected 400 for messageId=${bad}`);
    }
  });

  it('returns 404 when message does not exist', async () => {
    const res = await ctx.request.post('/api/report').send({ messageId: 999 });
    assert.equal(res.status, 404);
  });

  it('returns 201 for a valid report', async () => {
    const msg = insertMessage(ctx.db, 'Bad message');
    const res = await ctx.request.post('/api/report').send({ messageId: Number(msg.lastInsertRowid) });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  it('stores a trimmed report reason', async () => {
    const msg = insertMessage(ctx.db, 'Bad message');
    const msgId = Number(msg.lastInsertRowid);
    await ctx.request.post('/api/report').send({ messageId: msgId, reason: '  spam  ' });
    const report = ctx.db.prepare('SELECT * FROM reports WHERE message_id = ?').get(msgId);
    assert.ok(report);
    assert.equal(report.reason, 'spam');
  });

  it('rejects duplicate reports from the same origin', async () => {
    const msg = insertMessage(ctx.db, 'Bad message');
    const msgId = Number(msg.lastInsertRowid);

    const first = await ctx.request.post('/api/report').send({ messageId: msgId });
    const duplicate = await ctx.request.post('/api/report').send({ messageId: msgId });

    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.code, 'already_reported');
  });

  it('auto-deletes a message after 3 reports from distinct IPs', async () => {
    await teardown(ctx);
    ctx = setup({ trustProxy: true });

    const msg = insertMessage(ctx.db, 'Offensive message');
    const msgId = Number(msg.lastInsertRowid);

    for (const forwardedFor of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
      const res = await ctx.request
        .post('/api/report')
        .set('X-Forwarded-For', forwardedFor)
        .send({ messageId: msgId });
      assert.equal(res.status, 201);
    }

    const message = ctx.db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    const reports = ctx.db.prepare('SELECT * FROM reports WHERE message_id = ?').all(msgId);

    assert.equal(message, undefined);
    assert.equal(reports.length, 0);
  });

  it('does not delete message with fewer than 3 unique reports', async () => {
    await teardown(ctx);
    ctx = setup({ trustProxy: true });

    const msg = insertMessage(ctx.db, 'Borderline message');
    const msgId = Number(msg.lastInsertRowid);

    await ctx.request.post('/api/report').set('X-Forwarded-For', '1.1.1.1').send({ messageId: msgId });
    await ctx.request.post('/api/report').set('X-Forwarded-For', '2.2.2.2').send({ messageId: msgId });

    const message = ctx.db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    assert.ok(message);
  });
});

describe('GET /api/stats', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns 0 on empty database', async () => {
    const res = await ctx.request.get('/api/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  it('returns correct count after inserting messages', async () => {
    insertMessage(ctx.db, 'msg 1');
    insertMessage(ctx.db, 'msg 2');
    insertMessage(ctx.db, 'msg 3');
    const res = await ctx.request.get('/api/stats');
    assert.equal(res.body.total, 3);
  });
});

describe('GET /health and headers', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns healthy status', async () => {
    const res = await ctx.request.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('exposes expected security headers', async () => {
    const health = await ctx.request.get('/health');
    const stats = await ctx.request.get('/api/stats');

    assert.equal(health.headers['x-powered-by'], undefined);
    assert.match(health.headers['content-security-policy'] || '', /default-src 'self'/i);
    assert.equal(stats.headers['cache-control'], 'no-store');
  });
});

describe('Rate limiting', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('blocks after 5 write requests', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await ctx.request.post('/api/message').send({ content: `msg ${index}` });
      assert.equal(res.status, 201);
    }

    const res = await ctx.request.post('/api/message').send({ content: 'one too many' });
    assert.equal(res.status, 429);
    assert.match(res.body.error, /too many requests/i);
    assert.match(res.headers['retry-after'] || '', /^\d+$/);
    const retryAfter = Number(res.headers['retry-after']);
    assert.ok(retryAfter > 0 && retryAfter <= 120);
  });

  it('does not let X-Forwarded-For bypass write limits when trust proxy is disabled', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await ctx.request
        .post('/api/message')
        .set('X-Forwarded-For', `203.0.113.${index + 1}`)
        .send({ content: `Signal ${index}` });
      assert.equal(res.status, 201);
    }

    const blocked = await ctx.request
      .post('/api/message')
      .set('X-Forwarded-For', '198.51.100.42')
      .send({ content: 'Signal bloque' });

    assert.equal(blocked.status, 429);
  });

  it('blocks after 30 read requests', async () => {
    const { cookie, response } = await createAccessCookie(ctx, 'Read limited signal');

    for (let index = 0; index < 30; index += 1) {
      await ctx.request
        .post('/api/message/random')
        .set('Cookie', cookie)
        .send({ exclude: [response.body.id] });
    }

    const blocked = await ctx.request
      .post('/api/message/random')
      .set('Cookie', cookie)
      .send({ exclude: [response.body.id] });

    assert.equal(blocked.status, 429);
  });
});

describe('404 handler', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(async () => {
    await teardown(ctx);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await ctx.request.get('/api/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Not found');
  });

  it('returns 404 for unsupported methods', async () => {
    const res = await ctx.request.delete('/api/message');
    assert.equal(res.status, 404);
  });
});

describe('Standalone integration', () => {
  it('starts and serves /health with a file-backed database', async () => {
    const ctx = await createStandaloneContext();

    try {
      const response = await fetch(`${ctx.baseUrl}/health`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, 'healthy');
    } finally {
      await ctx.cleanup();
    }
  });

  it('keeps third-party geolocation disabled by default', async () => {
    let fetchCalled = false;
    const ctx = await createStandaloneContext({
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response(JSON.stringify({ country: 'France' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
    });

    try {
      const response = await fetch(`${ctx.baseUrl}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Pas de fuite d IP vers un tiers' })
      });

      assert.equal(response.status, 201);
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(fetchCalled, false);
    } finally {
      await ctx.cleanup();
    }
  });
});
