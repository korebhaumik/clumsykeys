// Opt-in real local Supabase smoke check; never reads the hosted .env.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createSupabasePersistence } from '../../backend/src/persistence';

const status = spawnSync('node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', env: process.env });
if (status.status !== 0) throw new Error('Start the local Supabase stack before running the smoke check.');
const config = JSON.parse(status.stdout);
assert.match(config.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):/);
const browser = createClient(config.API_URL, config.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(config.API_URL, config.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users: string[] = [];
try {
  const first = await browser.auth.signUp({ email: `smoke-${randomUUID()}@test.local`, password: 'local-test-password-123', options: { data: { display_name: 'Local smoke test' } } });
  assert.ifError(first.error); assert.ok(first.data.session); users.push(first.data.user!.id);
  const second = await admin.auth.admin.createUser({ email: `smoke-other-${randomUUID()}@test.local`, password: 'local-test-password-123', email_confirm: true });
  assert.ifError(second.error); users.push(second.data.user!.id);
  const db = createSupabasePersistence({ url: config.API_URL, secret: config.SECRET_KEY });
  const identity = await db.verify(first.data.session.access_token); assert.equal(identity.id, users[0]);
  assert.equal((await db.account(users[0])).displayName, 'Local smoke test');
  const result = { id: randomUUID(), mode: 'prose' as const, language: 'english', settings: {}, stats: {
    correct: 40, incorrect: 0, extra: 0, elapsedSeconds: 10, wpm: 60, raw: 60, accuracy: 100, deviation: 0, samples: [], history: [],
  } };
  await db.savePractice(users[0], result); await db.savePractice(users[0], result);
  assert.equal((await db.practiceHistory(users[0], 0)).length, 1);
  assert.equal(await db.practiceDetail(users[1], result.id), null);
  const ownRead = await browser.from('practice_results').select('id'); assert.ifError(ownRead.error); assert.equal(ownRead.data!.length, 1);
  const deniedWrite = await browser.from('practice_results').delete().eq('id', result.id); assert.ok(deniedWrite.error);
  const prefs = { version: 1, theme: 'classic' };
  assert.equal(await db.savePreferences(users[0], prefs, 0), 1);
  await assert.rejects(db.savePreferences(users[0], prefs, 0), /another device/);
  console.log('Real local Supabase passed: signup, verified JWT, profile trigger, atomic retry, owner filtering, denied browser writes, and preference conflict.');
} finally {
  for (const id of users) { const result = await admin.auth.admin.deleteUser(id); assert.ifError(result.error); }
}
