import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createApplication } from '../../backend/src/server';
import { createSupabasePersistence, PersistenceError } from '../../backend/src/persistence';
import { parsePractice, parsePreferences, type Preferences, type PracticeSubmission } from '../../backend/src/persistence.contract';
import { readSupabaseConfig } from '../../backend/src/config';
import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';

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
test('category PB reads authenticate owners and find matching bests across all saved rows', async () => {
  const db = createSupabasePersistence({ url: upstream, secret: 'sb_secret_test' });
  const owner = (await db.verify(tokenA)).id;
  const category = { mode: 'prose', language: 'english', test: 'time', length: 30 } as const;
  const path = '/api/practice-personal-best?mode=prose&language=english&test=time&length=30';
  assert.equal((await fetch(base + path)).status, 401);
  assert.equal((await request(path, 'invalid')).status, 401);
  for (const query of ['mode=prose&language=randomPy&test=time&length=30', 'mode=prose&language=english&test=time&length=-1', 'mode=prose&language=english&test=snippets&length=short']) {
    assert.equal((await request('/api/practice-personal-best?' + query)).status, 400);
  }
  assert.deepEqual(await (await request(path)).json(), { wpm: null });
  for (let index = 0; index < 24; index++) await db.savePractice(owner, {
    ...result, id: randomUUID(), language: 'english', settings: { ...settings, language: 'english', timer: index === 0 ? 30 : 60, words: null },
    stats: { ...result.stats, wpm: index === 0 ? 75 : 120 },
  });
  const response = await request(path);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { wpm: 75 });
  assert.equal(await db.practicePersonalBest(owner, category), 75);
  assert.deepEqual(await (await request(path + '&user_id=' + owner, tokenB)).json(), { wpm: null });
  assert.deepEqual(await (await request(path.replace('length=30', 'length=60'))).json(), { wpm: 120 });
  await db.savePractice(owner, { ...result, id: randomUUID(), language: 'english', settings: { ...settings, language: 'english', timer: null, words: null, quotes: 'Random Quotes' }, stats: { ...result.stats, wpm: 31 } });
  assert.equal(await db.practicePersonalBest(owner, { ...category, test: 'quotes', length: 'medium' }), 31);
  assert.equal(await db.practicePersonalBest(owner, { ...category, test: 'quotes', length: 'short' }), null);
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
  await waitFor(() => state?.users.length === 1);
  b.emit('joinRoom', { userId: roomId + '-b', username: 'Guest', roomId });
  await waitFor(() => state?.users.length === 2);
  if (timed) { a.emit('updateRaceSettings', { mode: 'time', duration: 15, errorThreshold: 10 }); await waitFor(() => state.settings.mode === 'time'); }
  a.emit('startVote', { roomId, userId: roomId + '-a' }); b.emit('startVote', { roomId, userId: roomId + '-b' });
  await waitFor(() => state?.progress === 'playing');
  return { a, b, snapshot: () => state };
}
test('race archives survive an immediate replay reset and expose only participant scoreboards', { timeout: 15000 }, async () => {
  const roomId = 'archive-complete', { a, b, snapshot } = await racingPair(roomId);
  try {
    const roundId = snapshot().roundId;
    const archivedSettings = structuredClone(snapshot().settings);
    a.emit('timeData', { roomId, userId: roomId + '-a', wpm: 60, accuracy: 95, typedChars: 20 });
    await waitFor(() => snapshot().users.find((r: any) => r.userId === roomId + '-a')?.wpm === 60);
    a.emit('timeData', { roomId, userId: roomId + '-a', wpm: 60, accuracy: 95, typedChars: snapshot().text.length });
    b.emit('timeData', { roomId, userId: roomId + '-b', wpm: 60, accuracy: 100, typedChars: snapshot().text.length });
    const finished = once(a, 'roomData');
    a.emit('finishGame', { roomId, userId: roomId + '-a' }); b.emit('finishGame', { roomId, userId: roomId + '-b' });
    await finished; await waitFor(() => snapshot().progress === 'finished');
    const livePlaces = snapshot().results.map(({ userId, score, place }: any) => [userId, score, place]);
    assert.deepEqual(livePlaces, [[roomId + '-b', 60, 1], [roomId + '-a', 57, 2]]);
    a.emit('resetGame', { roomId }); await waitFor(() => snapshot().progress === 'waiting');
    a.emit('updateRaceSettings', { mode: 'words', wordCount: 100 });
    await waitFor(() => snapshot().settings.mode === 'words');
    await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200);
    const saved = await (await request('/api/race-results/' + roundId)).json();
    assert.deepEqual(saved.round.settings, archivedSettings);
    assert.deepEqual(saved.results.map(({ racer_id, score, place }: any) => [racer_id, score, place]), livePlaces);
    const own = saved.results.find((r: any) => r.racer_id === roomId + '-a');
    assert.equal(saved.results.length, 2); assert.equal(own.wpm, 60);
    assert.ok(own.speed_history.length > 0); assert.ok(own.finish_seconds > 0);
    assert.ok(saved.results.every((r: any) => !('account_id' in r) && !('participant_id' in r)));
    assert.equal((await request('/api/race-results/' + roundId, tokenB)).status, 404);
    assert.equal((await (await request('/api/race-results/latest')).json()).round.id, roundId);
  } finally { a.disconnect(); b.disconnect(); }
});
test('timed races apply the error allowance to entered text and preserve timed qualification in the archive', { timeout: 26000 }, async () => {
  const { a, b, snapshot } = await racingPair('archive-timed', true);
  try {
    const roundId = snapshot().roundId;
    const sample = { roomId: 'archive-timed', enteredChars: 100, typedChars: 90 };
    a.emit('timeData', { ...sample, userId: 'archive-timed-a', wpm: 60, accuracy: 85 });
    b.emit('timeData', { ...sample, userId: 'archive-timed-b', wpm: 110, accuracy: 95, uncorrectedExtras: 1 });
    a.emit('finishGame', { roomId: 'archive-timed', userId: 'archive-timed-a' });
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(snapshot().users.find((r: { userId: string }) => r.userId === 'archive-timed-a').finished, false);
    await waitFor(() => snapshot().progress === 'finished', 18000);
    await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200);
    const saved = await (await request('/api/race-results/' + roundId)).json();
    assert.equal(saved.round.settings.errorThreshold, 10);
    assert.ok(saved.results.every((r: any) => r.finish_seconds === null));
    const outcomes = [['time-limit', 51, 1], ['error-limit', null, null]];
    assert.deepEqual(snapshot().results.map(({ reason, score, place }: any) => [reason, score, place]), outcomes);
    assert.deepEqual(saved.results.map(({ reason, score, place }: any) => [reason, score, place]), outcomes);
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

test('host termination freezes an aborted original roster with finished and partial scores before replay', { timeout: 15000 }, async () => {
  const roomId = 'archive-host-ended', { a, b, snapshot } = await racingPair(roomId);
  try {
    const roundId = snapshot().roundId, archivedSettings = { ...snapshot().settings };
    a.emit('timeData', { roomId, userId: roomId + '-a', wpm: 75, accuracy: 95, typedChars: snapshot().text.length });
    a.emit('finishGame', { roomId, userId: roomId + '-a' });
    b.emit('timeData', { roomId, userId: roomId + '-b', wpm: 40, accuracy: 90, typedChars: 10 });
    await waitFor(() => snapshot().users[0].finished && snapshot().users[1].typedChars === 10);
    a.emit('endRace', { roundId });
    await waitFor(() => snapshot().progress === 'waiting');
    a.emit('updateRaceSettings', { mode: 'words', wordCount: 100 });
    await waitFor(async () => (await request('/api/race-results/' + roundId)).status === 200);
    const saved = await (await request('/api/race-results/' + roundId)).json();
    assert.equal(saved.round.outcome, 'aborted');
    assert.deepEqual(saved.round.settings, archivedSettings);
    assert.equal(saved.results.length, 2);
    assert.ok(saved.results.every((r: any) => r.score === null && r.place === null));
    const finished = saved.results.find((r: any) => r.racer_id === roomId + '-a');
    const partial = saved.results.find((r: any) => r.racer_id === roomId + '-b');
    assert.equal(finished.reason, 'completed'); assert.equal(finished.wpm, 75); assert.ok(finished.finish_seconds > 0);
    assert.equal(partial.reason, 'disconnected'); assert.equal(partial.wpm, 40); assert.equal(partial.finish_seconds, null);
    assert.ok(partial.speed_history.length > 0);
  } finally { a.disconnect(); b.disconnect(); }
});

test('ending a timed race cancels its deadline before a subsequent round', { timeout: 26000 }, async () => {
  const roomId = 'archive-cancel-timer', { a, b, snapshot } = await racingPair(roomId, true);
  try {
    const roundId = snapshot().roundId;
    a.emit('endRace', { roundId });
    await waitFor(() => snapshot().progress === 'waiting');
    a.emit('updateRaceSettings', { mode: 'words', wordCount: 100 });
    await waitFor(() => snapshot().settings.mode === 'words');
    a.emit('startVote', { roomId, userId: roomId + '-a' }); b.emit('startVote', { roomId, userId: roomId + '-b' });
    await waitFor(() => snapshot().progress === 'playing');
    const nextRound = snapshot().roundId;
    await new Promise(resolve => setTimeout(resolve, 10500));
    assert.equal(snapshot().progress, 'playing'); assert.equal(snapshot().roundId, nextRound);
    assert.ok(snapshot().users.every((r: any) => !r.finished));
    a.emit('endRace', { roundId: nextRound });
    await waitFor(() => snapshot().progress === 'waiting');
  } finally { a.disconnect(); b.disconnect(); }
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

test('handle claims authenticate owners, normalize case, reject conflicts and retain prior values', async () => {
  const login = async (email: string) => (await (await fetch(upstream + '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: 'password123' }) })).json()).access_token as string;
  const [tokenA, tokenB] = await Promise.all([login('handle-a@test.local'), login('handle-b@test.local')]);
  const put = (token: string | null, body: unknown) => fetch(base + '/api/account/handle', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  assert.equal((await put(null, { handle: 'alexkeys' })).status, 401);
  assert.equal((await put(tokenA, { handle: '@invalid' })).status, 400);
  const own = await put(tokenA, { handle: '  AlexKeys  ', userId: 'somebody-else' });
  assert.equal(own.status, 200); assert.deepEqual(await own.json(), { handle: 'alexkeys' });
  assert.equal((await put(tokenA, { handle: 'ALEXKEYS' })).status, 200);
  const conflict = await put(tokenB, { handle: 'AlexKeys' });
  assert.equal(conflict.status, 409); assert.match((await conflict.json()).error, /Handle already taken/);
  const read = (token: string) => fetch(base + '/api/account', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
  assert.equal((await read(tokenA)).handle, 'alexkeys'); assert.equal((await read(tokenB)).handle, null);
  assert.equal((await put(tokenB, { handle: 'alexcodes' })).status, 200);
  const races = await Promise.all([put(tokenA, { handle: 'racing_handle' }), put(tokenB, { handle: 'RACING_HANDLE' })]);
  assert.deepEqual(races.map(r => r.status).sort(), [200, 409]);
});
