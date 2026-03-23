const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const Database = require('better-sqlite3');
const { createApp } = require('../server');

function setup() {
  const db = new Database(':memory:');
  const { app } = createApp(db);
  return { app, db, request: supertest(app) };
}

// Helper: insert a message directly into DB
function insertMessage(db, content, country = null) {
  return db.prepare('INSERT INTO messages (content, country) VALUES (?, ?)').run(content, country);
}

describe('POST /api/message', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

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

  it('returns 400 when content contains a URL (https)', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'visit https://evil.com' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /link/i);
  });

  it('returns 400 when content contains a URL (www.)', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'go to www.example' });
    assert.equal(res.status, 400);
  });

  it('returns 400 when content contains a URL (.com)', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'check google.com' });
    assert.equal(res.status, 400);
  });

  it('returns 400 when content contains a URL (bit.ly)', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'click bit.ly/abc' });
    assert.equal(res.status, 400);
  });

  it('returns 400 when content contains a URL (t.me)', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'join t.me/group' });
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

  it('stores message in database', async () => {
    const res = await ctx.request.post('/api/message').send({ content: 'Test message' });
    const row = ctx.db.prepare('SELECT * FROM messages WHERE id = ?').get(res.body.id);
    assert.ok(row);
    assert.equal(row.content, 'Test message');
  });
});

describe('POST /api/message/random', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

  it('returns 404 when database is empty', async () => {
    const res = await ctx.request.post('/api/message/random').send({});
    assert.equal(res.status, 404);
    assert.match(res.body.error, /no signals/i);
  });

  it('returns a message when messages exist', async () => {
    insertMessage(ctx.db, 'Hello from the void', 'France');
    const res = await ctx.request.post('/api/message/random').send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.content, 'Hello from the void');
    assert.equal(res.body.country, 'France');
    assert.ok(res.body.id);
    assert.ok(res.body.created_at);
  });

  it('returns 404 when all messages are excluded', async () => {
    const result = insertMessage(ctx.db, 'Only message');
    const res = await ctx.request.post('/api/message/random').send({ exclude: [Number(result.lastInsertRowid)] });
    assert.equal(res.status, 404);
    assert.match(res.body.error, /seen all signals/i);
  });

  it('filters out non-integer exclude values', async () => {
    insertMessage(ctx.db, 'Test message');
    const res = await ctx.request.post('/api/message/random').send({ exclude: ['abc', -1, 0, 1.5] });
    assert.equal(res.status, 200);
    assert.equal(res.body.content, 'Test message');
  });

  it('handles empty exclude array', async () => {
    insertMessage(ctx.db, 'Test message');
    const res = await ctx.request.post('/api/message/random').send({ exclude: [] });
    assert.equal(res.status, 200);
  });

  it('handles non-array exclude gracefully', async () => {
    insertMessage(ctx.db, 'Test message');
    const res = await ctx.request.post('/api/message/random').send({ exclude: 'not-an-array' });
    assert.equal(res.status, 200);
  });
});

describe('POST /api/report', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

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

  it('stores report with reason', async () => {
    const msg = insertMessage(ctx.db, 'Bad message');
    const msgId = Number(msg.lastInsertRowid);
    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'spam' });
    const report = ctx.db.prepare('SELECT * FROM reports WHERE message_id = ?').get(msgId);
    assert.ok(report);
    assert.equal(report.reason, 'spam');
  });

  it('auto-deletes message after 3 reports', async () => {
    const msg = insertMessage(ctx.db, 'Offensive message');
    const msgId = Number(msg.lastInsertRowid);

    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'report 1' });
    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'report 2' });
    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'report 3' });

    // Message should be deleted
    const message = ctx.db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    assert.equal(message, undefined);

    // Reports should also be cleaned up
    const reports = ctx.db.prepare('SELECT * FROM reports WHERE message_id = ?').all(msgId);
    assert.equal(reports.length, 0);
  });

  it('does not delete message with fewer than 3 reports', async () => {
    const msg = insertMessage(ctx.db, 'Borderline message');
    const msgId = Number(msg.lastInsertRowid);

    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'report 1' });
    await ctx.request.post('/api/report').send({ messageId: msgId, reason: 'report 2' });

    const message = ctx.db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    assert.ok(message);
  });
});

describe('GET /api/stats', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

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

describe('GET /health', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

  it('returns healthy status', async () => {
    const res = await ctx.request.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.uptime === 'number');
  });
});

describe('Rate limiting', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

  it('blocks after 5 write requests', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await ctx.request.post('/api/message').send({ content: `msg ${i}` });
      assert.equal(res.status, 201);
    }
    const res = await ctx.request.post('/api/message').send({ content: 'one too many' });
    assert.equal(res.status, 429);
    assert.match(res.body.error, /too many requests/i);
  });

  it('blocks after 30 read requests', async () => {
    for (let i = 0; i < 30; i++) {
      await ctx.request.post('/api/message/random').send({});
    }
    const res = await ctx.request.post('/api/message/random').send({});
    assert.equal(res.status, 429);
  });
});

describe('404 handler', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  afterEach(() => { ctx.db.close(); });

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
