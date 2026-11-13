import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../../backend/src/server';
import { createSupabasePersistence } from '../../backend/src/persistence';

const origin = process.env.SIMULATION_URL || 'http://127.0.0.1:15443/supabase';
const session = await (await fetch(origin + '/auth/v1/token?grant_type=password', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${randomUUID()}@test.local`, password: 'password123' }),
})).json();
const server = createApplication({ persistence: createSupabasePersistence({ url: origin, secret: 'sb_secret_test' }) });
server.httpServer.listen(0, '127.0.0.1'); await once(server.httpServer, 'listening');
const address = server.httpServer.address(); assert.ok(address && typeof address === 'object');
const url = `http://127.0.0.1:${address.port}`;
const result = { id: randomUUID(), mode: 'prose', language: 'english', settings: {
  language: 'english', punctuations: null, numbers: null, timer: 30, words: null, quotes: null,
  difficulty: { wpmLimit: null, timeLimit: null },
}, stats: { correct: 40, incorrect: 0, extra: 0, elapsedSeconds: 10, samples: [], history: [] } };
const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
try {
  await fetch(origin + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: true }) });
  const failed = await fetch(url + '/api/practice-results', { method: 'POST', headers, body: JSON.stringify(result) });
  assert.equal(failed.status, 503);
  assert.equal((await fetch(url + '/health')).status, 200);
  await fetch(origin + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: false }) });
  for (let retry = 0; retry < 2; retry++) assert.equal((await fetch(url + '/api/practice-results', { method: 'POST', headers, body: JSON.stringify(result) })).status, 201);
  const history = await (await fetch(url + '/api/history?kind=practice', { headers })).json();
  assert.equal(history.results.length, 1); assert.equal(history.results[0].wpm, 60);
  const dashboard = await (await fetch(url + '/api/account/dashboard', { headers })).json();
  assert.equal(dashboard.stats.tests, 1); assert.equal(dashboard.stats.averageWpm, 60);
  assert.equal(dashboard.stats.characters, 40);
  assert.equal(dashboard.bests[0].id, result.id); assert.equal(dashboard.recent[0].id, result.id);
  const query = '/api/leaderboards/solo?mode=prose&language=english&test=time&length=30&range=all&page=1';
  const rankings = await (await fetch(url + query, { headers })).json();
  assert.equal(rankings.currentUser.id, result.id); assert.equal(rankings.currentUser.rank, 1);
  assert.equal((await (await fetch(url + query)).json()).currentUser, null);
  await fetch(origin + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: true }) });
  assert.equal((await fetch(url + query)).status, 503);
  await fetch(origin + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: false }) });
  console.log('Simulation passed: upstream write outage yields 503, health stays available, and a retry saves exactly one result.');
} finally {
  await fetch(origin + '/__control', { method: 'POST', body: JSON.stringify({ failWrites: false }) });
  await new Promise<void>(resolve => server.io.close(() => resolve()));
}
