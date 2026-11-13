import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createApplication } from '../../backend/src/server';
import { createSupabasePersistence, PersistenceError } from '../../backend/src/persistence';
import { parsePractice, parsePreferences, type Preferences, type PracticeSubmission } from '../../backend/src/persistence.contract';
import { readSupabaseConfig } from '../../backend/src/config';
import { io } from 'socket.io-client';

let fixture: ChildProcess, upstream: string, server: ReturnType<typeof createApplication>, base: string;
let tokenA: string, tokenB: string;
const settings: Preferences['prose'] = { punctuations: null, numbers: null, language: 'english 2k', timer: null, words: 25,
  quotes: null, difficulty: { wpmLimit: null, timeLimit: null } };
const result: PracticeSubmission = { id: '12345678-1234-4234-8234-123456789abc', mode: 'prose', language: 'english 2k', settings,
  stats: { correct: 40, incorrect: 10, extra: 0, elapsedSeconds: 10, wpm: 999, raw: 999, accuracy: 999, deviation: 999,
    samples: [{ seconds: 10, wpm: 60, raw: 75, errors: 10 }], history: [{ word: 'hello', wpm: 60, errors: 1 }] } };
const preferences: Preferences = { version: 1, theme: 'classic', prose: settings,
  code: { mode: 'snippets', language: 'randomPy', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false } } };

before(async () => {
  fixture = spawn(process.execPath, ['postman/mocks/supabase/default.cjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  upstream = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('HTTP fixture failed to start')), 5000);
    fixture.once('error', reject);
    fixture.stdout!.on('data', data => { const match = String(data).match(/listening on (\d+)/); if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); } });
  });
  const login = async (email: string) => (await (await fetch(upstream + '/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email, password: 'password123' }),
  })).json()).access_token;
  [tokenA, tokenB] = await Promise.all([login('a@test.local'), login('b@test.local')]);
  server = createApplication({ persistence: createSupabasePersistence({ url: upstream, secret: 'sb_secret_test' }) });
  server.httpServer.listen(0, '127.0.0.1'); await once(server.httpServer, 'listening');
  const address = server.httpServer.address(); assert.ok(address && typeof address === 'object'); base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.io.close(() => resolve()));
  if (fixture) { fixture.kill(); await once(fixture, 'exit'); }
});
function request(path: string, token = tokenA, body?: unknown, method = 'POST') {
  return fetch(base + path, { method: body === undefined ? 'GET' : method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
test('configuration and shared validation reject incomplete settings and non-finite metrics', () => {
  assert.equal(readSupabaseConfig({}), undefined);
  assert.throws(() => readSupabaseConfig({ SUPABASE_URL: 'https://example.com' }), /both/);
  assert.throws(() => readSupabaseConfig({ SUPABASE_URL: 'http://example.com', SUPABASE_SECRET_KEY: 'secret' }), /HTTPS/);
  assert.equal(parsePreferences({ ...preferences, prose: { ...settings, timer: 30 } }), undefined);
  assert.equal(parsePreferences({ ...preferences, code: { ...preferences.code, language: 'malformed' } }), undefined);
  assert.equal(parsePractice({ ...result, stats: { ...result.stats, elapsedSeconds: 0 } }), undefined);
  assert.equal(parsePractice({ ...result, stats: { ...result.stats, correct: Infinity } }), undefined);
  assert.equal(parsePractice({ ...result, settings: { words: -1 } }), undefined);
  assert.equal(parsePractice({ ...result, language: 'forged' }), undefined);
  const normalized = parsePractice(result)!;
  assert.equal(normalized.stats.wpm, 60); assert.equal(normalized.stats.raw, 75); assert.equal(normalized.stats.accuracy, 80);
});
test('HTTP authentication, owner isolation, canonical metrics, and retry IDs use the real SDK over HTTP', async () => {
  assert.equal((await fetch(base + '/api/history?kind=practice')).status, 401);
  assert.equal((await request('/api/account', 'invalid')).status, 401);
  assert.equal((await request('/api/history?kind=wrong')).status, 400);
  assert.equal((await request('/api/history?kind=practice&offset=-1')).status, 400);
  assert.equal((await request('/api/practice-results', tokenA, { ...result, user_id: 'attacker' })).status, 201);
  assert.equal((await request('/api/practice-results', tokenA, result)).status, 201);
  assert.equal((await request('/api/practice-results', tokenB, result)).status, 409);
  const history = await (await request('/api/history?kind=practice')).json();
  assert.equal(history.results.length, 1); assert.equal(history.results[0].wpm, 60); assert.equal(history.results[0].accuracy, 80);
  assert.equal((await (await request('/api/history?kind=practice', tokenB)).json()).results.length, 0);
  assert.equal((await request(`/api/practice-results/${result.id}`, tokenB)).status, 404);
  const detail = await (await request(`/api/practice-results/${result.id}`)).json();
  assert.deepEqual(detail.samples, result.stats.samples);
});
test('preferences enforce compare-and-swap and account ownership', async () => {
  const first = await request('/api/account/preferences', tokenA, { preferences, revision: 0 }, 'PUT');
  assert.equal(first.status, 200); assert.equal((await first.json()).revision, 1);
  assert.equal((await request('/api/account/preferences', tokenA, { preferences, revision: 0 }, 'PUT')).status, 409);
  assert.deepEqual((await (await request('/api/account')).json()).preferences, preferences);
  assert.equal((await (await request('/api/account', tokenB)).json()).preferences, null);
});
test('dashboard authenticates the owner and returns private lifetime totals, bests and recent results', async () => {
  assert.equal((await fetch(base + '/api/account/dashboard')).status, 401);
  assert.equal((await request('/api/account/dashboard', 'invalid')).status, 401);
  const response = await request('/api/account/dashboard');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const dashboard = await response.json();
  assert.deepEqual(dashboard.stats, { tests: 1, seconds: 10, characters: 50, averageWpm: 60, averageRaw: 75, averageAccuracy: 80, bestWpm: 60 });
  assert.equal(dashboard.bests[0].id, result.id); assert.equal(dashboard.recent[0].id, result.id);
  const other = await (await request('/api/account/dashboard?user_id=attacker', tokenB)).json();
  assert.equal(other.stats.tests, 0); assert.equal(other.stats.characters, 0); assert.deepEqual(other.bests, []); assert.deepEqual(other.recent, []);
});
test('database outage returns retryable errors without breaking health or guest room access', async () => {
  await fetch(upstream + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: true }) });
  try {
    const failed = await request('/api/practice-results', tokenA, { ...result, id: '12345678-1234-4234-8234-123456789abd' });
    assert.equal(failed.status, 503); assert.match((await failed.json()).error, /retry/i);
    assert.equal((await fetch(base + '/health')).status, 200);
    const guest = io(base); await once(guest, 'connect');
    try { const snapshot = once(guest, 'roomData'); guest.emit('joinRoom', { userId: 'guest', username: 'Guest', roomId: 'outage-test' }); assert.equal((await snapshot)[0].users.length, 1); }
    finally { guest.disconnect(); }
  } finally { await fetch(upstream + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: false }) }); }
});
test('Socket.IO rejects supplied invalid identities while allowing guests and verified accounts', async () => {
  const invalid = io(base, { auth: { accessToken: 'invalid' }, reconnection: false });
  try { const [error] = await once(invalid, 'connect_error'); assert.match(error.message, /session/i); }
  finally { invalid.disconnect(); }
  const owned = io(base, { auth: { accessToken: tokenA } }); await once(owned, 'connect');
  const guest = io(base); await once(guest, 'connect');
  try {
    const session = once(owned, 'roomSession');
    owned.emit('joinRoom', { userId: 'a', username: 'Ada', roomId: 'account-ownership' });
    const [{ resumeToken }] = await session;
    const error = once(guest, 'error');
    guest.emit('joinRoom', { userId: 'a', username: 'Ada', roomId: 'account-ownership', resumeToken });
    assert.match((await error)[0].msg, /different account/);
  } finally { owned.disconnect(); guest.disconnect(); }
});
test('verified token transport reports expired sessions as authentication errors', async () => {
  const db = createSupabasePersistence({ url: upstream, secret: 'sb_secret_test' });
  await assert.rejects(db.verify('untrusted.token'), (error: unknown) => error instanceof PersistenceError && error.status === 401);
});

async function waitFor(predicate: () => boolean | Promise<boolean>, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.fail('Expected state before timeout');
}
async function racingPair(roomId: string, timed = false) {
  const a = io(base, { auth: { accessToken: tokenA } }), b = io(base);
  await Promise.all([once(a, 'connect'), once(b, 'connect')]);
  let state: any;
  a.on('roomData', value => { state = value; });
  a.emit('joinRoom', { userId: roomId + '-a', username: 'Ada', roomId });
  b.emit('joinRoom', { userId: roomId + '-b', username: 'Guest', roomId });
  await waitFor(() => state?.users.length === 2);
  if (timed) { a.emit('updateRaceSettings', { mode: 'time', duration: 15 }); await waitFor(() => state.settings.mode === 'time'); }
  a.emit('startVote', { roomId, userId: roomId + '-a' }); b.emit('startVote', { roomId, userId: roomId + '-b' });
  await waitFor(() => state?.progress === 'playing');
  return { a, b, snapshot: () => state };
}
test('race archives survive an immediate replay reset and expose only participant scoreboards', { timeout: 15000 }, async () => {
  const roomId = 'archive-complete', { a, b, snapshot } = await racingPair(roomId);
  try {
    const roundId = snapshot().roundId;
    a.emit('timeData', { roomId, userId: roomId + '-a', wpm: 60, accuracy: 95, typedChars: 20 });
    await waitFor(() => snapshot().users.find((r: any) => r.userId === roomId + '-a')?.wpm === 60);
    a.emit('timeData', { roomId, userId: roomId + '-a', wpm: 60, accuracy: 95, typedChars: snapshot().text.length });
    b.emit('timeData', { roomId, userId: roomId + '-b', wpm: 60, accuracy: 100, typedChars: snapshot().text.length });
    const finished = once(a, 'roomData');
    a.emit('finishGame', { roomId, userId: roomId + '-a' }); b.emit('finishGame', { roomId, userId: roomId + '-b' });
    await finished; await waitFor(() => snapshot().progress === 'finished');
    a.emit('resetGame', { roomId }); await waitFor(() => snapshot().progress === 'waiting');
    await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200);
    const saved = await (await request('/api/race-results/' + roundId)).json();
    const own = saved.results.find((r: any) => r.racer_id === roomId + '-a');
    assert.equal(saved.results.length, 2); assert.equal(own.wpm, 60);
    assert.ok(own.speed_history.length > 0); assert.ok(own.finish_seconds > 0);
    assert.ok(saved.results.every((r: any) => !('account_id' in r) && !('participant_id' in r)));
    assert.equal((await request('/api/race-results/' + roundId, tokenB)).status, 404);
    assert.equal((await (await request('/api/race-results/latest')).json()).round.id, roundId);
  } finally { a.disconnect(); b.disconnect(); }
});
test('timed races persist the deadline outcome without fabricating passage finish times', { timeout: 26000 }, async () => {
  const { a, b, snapshot } = await racingPair('archive-timed', true);
  try {
    const roundId = snapshot().roundId;
    a.emit('timeData', { roomId: 'archive-timed', userId: 'archive-timed-a', wpm: 60, accuracy: 100, typedChars: snapshot().text.length });
    a.emit('finishGame', { roomId: 'archive-timed', userId: 'archive-timed-a' });
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(snapshot().users.find((r: { userId: string }) => r.userId === 'archive-timed-a').finished, false);
    await waitFor(() => snapshot().progress === 'finished', 18000);
    await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200);
    const saved = await (await request('/api/race-results/' + roundId)).json();
    assert.ok(saved.results.every((r: any) => r.reason === 'time-limit' && r.finish_seconds === null));
  } finally { a.disconnect(); b.disconnect(); }
});
test('abandoned races retain disconnected participants after recovery expires', { timeout: 42000 }, async () => {
  const { a, b, snapshot } = await racingPair('archive-abandoned');
  const roundId = snapshot().roundId;
  a.disconnect(); b.disconnect();
  await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200, 34000);
  const saved = await (await request('/api/race-results/' + roundId)).json();
  assert.equal(saved.round.outcome, 'aborted'); assert.equal(saved.results.length, 2);
  assert.ok(saved.results.every((r: any) => r.reason === 'disconnected'));
});

 test('public solo rankings expose summary fields and derive current rank from the verified token', async () => {
  const query = '/api/leaderboards/solo?mode=prose&language=english+2k&test=words&length=25&range=all&page=1';
  const publicResponse = await fetch(base + query); assert.equal(publicResponse.status, 200);
  const publicPage = await publicResponse.json(); assert.equal(publicPage.currentUser, null);
  assert.equal(publicPage.total, 1); assert.equal(publicPage.rows[0].wpm, 60);
  assert.equal('user_id' in publicPage.rows[0], false); assert.equal('settings' in publicPage.rows[0], false);
  const own = await (await request(query)).json(); assert.equal(own.currentUser.rank, 1);
  const foreign = await (await request(query + '&userId=attacker', tokenB)).json(); assert.equal(foreign.currentUser, null);
  assert.equal((await request(query, 'invalid')).status, 401);
  assert.equal((await fetch(base + query.replace('length=25', 'length=oops'))).status, 400);
  await fetch(upstream + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: true }) });
  try { assert.equal((await fetch(base + query)).status, 503); }
  finally { await fetch(upstream + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: false }) }); }
 });

test('account write quota is tied to the verified account and exposes a retry delay', async () => {
  let last: Response | undefined;
  for (let n = 0; n < 31; n++) last = await request('/api/account/preferences', tokenB, { preferences: null }, 'PUT');
  assert.equal(last!.status, 429); assert.ok(Number(last!.headers.get('retry-after')) > 0);
  assert.equal((await request('/api/account', tokenB)).status, 200);
});
