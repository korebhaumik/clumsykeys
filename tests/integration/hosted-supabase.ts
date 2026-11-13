// Explicit hosted smoke check. Only its own temporary Auth users are removed.
// Admin creation confirms email directly, so no verification emails are sent.
import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createClient } from '@supabase/supabase-js';
import { createSupabasePersistence } from '../../backend/src/persistence';
import { createApplication } from '../../backend/src/server';
import type { Preferences } from '../../backend/src/persistence.contract';

loadEnvFile(new URL('../../.env', import.meta.url));
const url = process.env.SUPABASE_URL!, secret = process.env.SUPABASE_SECRET_KEY!, publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
assert.equal(url, process.env.VITE_SUPABASE_URL, 'Frontend and backend must target the same project');
const options = { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } };
const admin = createClient(url, secret, options);
const users: string[] = [];
const server = createApplication({ persistence: createSupabasePersistence({ url, secret }) });
server.httpServer.listen(0, '127.0.0.1'); await once(server.httpServer, 'listening');
const address = server.httpServer.address(); assert.ok(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
const clients = [createClient(url, publicKey, options), createClient(url, publicKey, options)];
try {
  const tokens: string[] = [];
  for (const client of clients) {
    const email = `clumsy-integration-${randomUUID()}@example.com`, password = randomUUID() + '!aA7';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Integration verification' } });
    assert.ifError(created.error); users.push(created.data.user!.id);
    const signedIn = await client.auth.signInWithPassword({ email, password }); assert.ifError(signedIn.error);
    tokens.push(signedIn.data.session!.access_token);
  }
  const headers = { Authorization: `Bearer ${tokens[0]}`, 'Content-Type': 'application/json' };
  const account = await fetch(base + '/api/account', { headers }); assert.equal(account.status, 200);
  assert.equal((await account.json()).displayName, 'Integration verification');
  const preferences: Preferences = { version: 1, theme: 'dark-forest', prose: { language: 'english', punctuations: null, numbers: null, timer: 30, words: null, quotes: null, difficulty: { wpmLimit: null, timeLimit: null } },
    code: { mode: 'snippets', language: 'randomPy', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false } } };
  assert.equal((await fetch(base + '/api/account/preferences', { method: 'PUT', headers, body: JSON.stringify({ preferences, revision: 0 }) })).status, 200);
  const result = { id: randomUUID(), mode: 'prose', language: 'english', settings: preferences.prose,
    stats: { correct: 40, incorrect: 10, extra: 0, elapsedSeconds: 10, samples: [{ seconds: 10, wpm: 60, raw: 75, errors: 10 }], history: [{ word: 'sample', wpm: 60, errors: 1 }] } };
  for (let retry = 0; retry < 2; retry++) assert.equal((await fetch(base + '/api/practice-results', { method: 'POST', headers, body: JSON.stringify(result) })).status, 201);
  const history = await (await fetch(base + '/api/history?kind=practice', { headers })).json();
  assert.equal(history.results.length, 1); assert.equal(history.results[0].wpm, 60); assert.equal(history.results[0].accuracy, 80);
  const dashboard = await (await fetch(base + '/api/account/dashboard', { headers })).json();
  assert.deepEqual(dashboard.stats, { tests: 1, seconds: 10, characters: 50, averageWpm: 60, averageRaw: 75, averageAccuracy: 80, bestWpm: 60 });
  assert.equal(dashboard.bests[0].id, result.id); assert.equal(dashboard.recent[0].id, result.id);
  const empty = await (await fetch(base + '/api/account/dashboard', { headers: { Authorization: `Bearer ${tokens[1]}` } })).json();
  assert.equal(empty.stats.tests, 0); assert.equal(empty.stats.characters, 0); assert.deepEqual(empty.recent, []);
  const deniedDashboard = await clients[0].rpc('read_account_dashboard', { p_user_id: users[1] }); assert.ok(deniedDashboard.error);
  assert.equal((await fetch(base + '/api/practice-results/' + result.id, { headers: { Authorization: `Bearer ${tokens[1]}` } })).status, 404);
  const foreign = await clients[1].from('practice_results').select('id').eq('id', result.id); assert.ifError(foreign.error); assert.equal(foreign.data!.length, 0);
  const directWrite = await clients[0].from('practice_results').delete().eq('id', result.id); assert.ok(directWrite.error);
  const query = '/api/leaderboards/solo?mode=prose&language=english&test=time&length=30&range=all&page=1';
  const publicRankings = await fetch(base + query); assert.equal(publicRankings.status, 200);
  const ranked = await publicRankings.json(); assert.ok(ranked.total >= 1); assert.equal(ranked.currentUser, null);
  const own = await (await fetch(base + query, { headers })).json();
  assert.equal(own.currentUser.id, result.id); assert.ok(own.currentUser.rank >= 1); assert.equal(own.currentUser.wpm, 60);
  assert.notEqual(own.currentUser.userId, users[0]); assert.equal('settings' in own.currentUser, false);
  const deniedRankings = await clients[0].rpc('read_solo_leaderboard', { p_filters: {}, p_viewer: users[1] }); assert.ok(deniedRankings.error);
  console.log('Hosted solo leaderboard passed: public summaries, verified own rank, and denied browser RPC access.');
  console.log('Hosted Supabase passed: real JWTs, profile trigger, preference write, atomic practice save/retry, private history, RLS isolation, and denied browser writes.');
} finally {
  const cleanup = await Promise.allSettled(users.map(async id => {
    const deleted = await admin.auth.admin.deleteUser(id); assert.ifError(deleted.error);
  }));
  await new Promise<void>(resolve => server.io.close(() => resolve()));
  assert.ok(cleanup.every(result => result.status === 'fulfilled'), 'Temporary user cleanup failed; check the hosted Auth user list.');
  console.log('Temporary verification users removed.');
}
