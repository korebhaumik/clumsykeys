import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { io } from 'socket.io-client';
import { createApplication } from '../../backend/src/server';
import { createRateLimit } from '../../backend/src/security';
import { isPublicSupabaseKey, publicSupabaseError } from '../../src/lib/services/public-config';
import { parsePractice } from '../../backend/src/persistence.contract';
import { rooms } from '../../backend/src/store';
import { spawnSync } from 'node:child_process';

test('public configuration rejects privileged keys and insecure project URLs without echoing credentials', () => {
  const jwt = (role: string) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'fixture'].join('.');
  assert.equal(isPublicSupabaseKey('sb_publishable_test'), true);
  assert.equal(isPublicSupabaseKey(jwt('anon')), true);
  for (const key of ['sb_secret_test', jwt('service_role'), jwt('authenticated'), 'invalid']) {
    assert.equal(isPublicSupabaseKey(key), false);
    assert.ok(publicSupabaseError('https://example.com', key));
    assert.ok(!publicSupabaseError('https://example.com', key).includes(key));
  }
  assert.ok(publicSupabaseError('http://example.com', 'sb_publishable_test'));
  assert.ok(publicSupabaseError('https://user:password@example.com', 'sb_publishable_test'));
  assert.equal(publicSupabaseError('http://127.0.0.1:54321', 'sb_publishable_test'), '');
  assert.equal(publicSupabaseError(), '');
});

test('rate windows expire and a saturated key registry fails closed without unbounded growth', () => {
  const consume = createRateLimit(2, 1000, 2);
  assert.equal(consume('a', 0), 0); assert.equal(consume('a', 1), 0);
  assert.equal(consume('a', 2), 1);
  assert.equal(consume('b', 2), 0); assert.equal(consume('c', 2), 1);
  assert.equal(consume('c', 1000), 0);
  assert.equal(consume('a', 2001), 0);
});

test('Vite refuses a secret key under either a public key name or another exposed variable', () => {
  for (const overrides of [{ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' }, { VITE_SUPABASE_SECRET_KEY: 'sb_secret_test' }]) {
    const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
      encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: 'https://example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', ...overrides },
    });
    assert.notEqual(build.status, 0); assert.match(build.stderr, /Unsafe client environment variable/);
    assert.ok(!build.stderr.includes('sb_secret_test'));
  }
});

test('practice validation rejects impossible speed and strips unapproved detail fields', () => {
  const result = { id: '12345678-1234-4234-8234-123456789abc', mode: 'prose', language: 'english',
    settings: { language: 'english', timer: null, words: 25, quotes: null, punctuations: null, numbers: null, difficulty: { wpmLimit: null, timeLimit: null } },
    stats: { correct: 40, incorrect: 10, extra: 0, elapsedSeconds: 10,
      samples: [{ seconds: 10, wpm: 60, raw: 75, errors: 10, unapproved: 'discard' }],
      history: [{ word: 'hello', wpm: 60, errors: 1, unapproved: 'discard' }] } };
  assert.equal(parsePractice({ ...result, stats: { ...result.stats, elapsedSeconds: 0.001 } }), undefined);
  const normalized = parsePractice(result)!;
  assert.equal(normalized.stats.wpm, 60);
  assert.equal('unapproved' in normalized.stats.samples[0], false);
  assert.equal('unapproved' in normalized.stats.history[0], false);
});

test('HTTP headers, no-reflection errors and socket origins are enforced on the real transports', async () => {
  const server = createApplication();
  server.httpServer.listen(0, '127.0.0.1'); await once(server.httpServer, 'listening');
  const address = server.httpServer.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const clients: ReturnType<typeof io>[] = [];
  try {
    const response = await fetch(base + '/health');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    const unknown = await fetch(base + '/reflect-me');
    assert.equal(unknown.status, 404); assert.deepEqual(await unknown.json(), { error: 'Route not found.' });
    const malformed = await fetch(base + '/api/practice-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"private":"do-not-reflect"' });
    assert.equal(malformed.status, 400); assert.deepEqual(await malformed.json(), { error: 'Invalid JSON request.' });
    const hostile = io(base, { transports: ['websocket'], extraHeaders: { Origin: 'https://attacker.invalid' }, reconnection: false }); clients.push(hostile);
    await once(hostile, 'connect_error'); assert.equal(hostile.connected, false);
    const allowed = io(base, { transports: ['websocket'], extraHeaders: { Origin: 'http://localhost:5173' }, reconnection: false }); clients.push(allowed);
    await once(allowed, 'connect');
    // Reconnecting clients can flush one buffered sample per recovery second.
    for (let n = 0; n < 30; n++) allowed.emit('timeData', {});
    const empty = 'security-cleanup'; const state = once(allowed, 'roomData');
    allowed.emit('joinRoom', { username: 'Guest', userId: 'guest', roomId: empty }); await state;
    assert.ok(rooms.has(empty));
    const disconnected = once(server.io.sockets.sockets.get(allowed.id!)!, 'disconnect'); allowed.disconnect(); await disconnected;
    assert.equal(rooms.has(empty), false);
    const flood = io(base, { reconnection: false }); clients.push(flood); await once(flood, 'connect');
    const closed = once(flood, 'disconnect'); for (let n = 0; n < 61; n++) flood.emit('timeData', {}); await closed;
    for (let n = 0; n < 240; n++) {
      const status = await fetch(base + '/api/status');
      if (status.status === 429) { assert.ok(Number(status.headers.get('retry-after')) > 0); break; }
      assert.ok(n < 239, 'the API must reject a flood');
    }
    const forwarded = await fetch(base + '/api/status', { headers: { 'X-Forwarded-For': '198.51.100.1' } });
    assert.equal(forwarded.status, 429);
    assert.equal((await fetch(base + '/health')).status, 200);
  } finally { clients.forEach(client => client.disconnect()); await new Promise<void>(resolve => server.io.close(() => resolve())); }
});
