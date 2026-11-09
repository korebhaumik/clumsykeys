import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { io, type Socket } from 'socket.io-client';
import { createApplication } from '../../backend/src/server';

async function waitFor(predicate: () => boolean, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (!predicate() && Date.now() < deadline) await delay(20);
  assert.ok(predicate(), 'expected room state before timeout');
}

test('real HTTP and Socket.IO enforce validation, ownership, countdown, recovery, completion and reset', { timeout: 20000 }, async () => {
  const server = createApplication();
  server.httpServer.listen(0, '127.0.0.1');
  await once(server.httpServer, 'listening');
  const address = server.httpServer.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Socket[] = [];
  const roomId = `test-${Date.now()}`;
  let state: any;
  let token = '';
  try {
    for (const query of ['', '?roomId=', '?roomId=a&roomId=b']) assert.equal((await fetch(url + '/rooms' + query)).status, 400);
    assert.equal((await fetch(url + '/rooms?roomId=missing')).status, 404);
    const a = io(url), b = io(url), stranger = io(url); clients.push(a, b, stranger);
    await Promise.all(clients.map(socket => once(socket, 'connect')));
    a.on('roomData', value => { state = value; });
    a.on('roomSession', value => { token = value.resumeToken; });
    const invalid = once(stranger, 'error'); stranger.emit('joinRoom', null);
    assert.match((await invalid)[0].msg, /required/);
    a.emit('joinRoom', { username: 'Ada', roomId, userId: 'a' });
    await waitFor(() => state?.users.length === 1);
    a.emit('startVote', { roomId, userId: 'a' });
    await waitFor(() => state.users[0].vote);
    assert.equal(state.startsAt, undefined);
    b.emit('joinRoom', { username: 'Lin', roomId, userId: 'b' });
    await waitFor(() => state.users.length === 2);
    a.emit('updateRaceSettings', { punctuation: false });
    await waitFor(() => !state.settings.punctuation);
    assert.ok(state.users.every((u: any) => !u.vote));
    stranger.emit('startVote', { roomId, userId: 'b' });
    await delay(80); assert.equal(state.users[1].vote, false);
    const roster = await (await fetch(url + '/rooms?roomId=' + roomId)).json();
    assert.deepEqual(roster.map((u: any) => u.username), ['Ada', 'Lin']);
    a.emit('startVote', { roomId, userId: 'a' }); b.emit('startVote', { roomId, userId: 'b' });
    await waitFor(() => !!state.startsAt);
    b.emit('stopVote', { roomId, userId: 'b' });
    await waitFor(() => !state.startsAt);
    b.emit('startVote', { roomId, userId: 'b' });
    await waitFor(() => state.progress === 'playing');
    a.emit('updateRaceSettings', { punctuation: true });
    a.emit('timeData', { roomId, userId: 'a', wpm: 100, typedChars: 10, accuracy: 101 });
    stranger.emit('timeData', { roomId, userId: 'a', wpm: 100, typedChars: 10, accuracy: 100 });
    await delay(80); assert.equal(state.settings.punctuation, false); assert.equal(state.users[0].wpm, 0);
    a.disconnect();
    const resumed = io(url); clients.push(resumed); await once(resumed, 'connect');
    resumed.on('roomData', value => { state = value; });
    resumed.emit('joinRoom', { username: 'Ada', roomId, userId: 'a', resumeToken: token });
    await waitFor(() => state.progress === 'playing' && state.users.length === 2);
    resumed.emit('timeData', { roomId, userId: 'a', wpm: 60, typedChars: 20, accuracy: 100 });
    await waitFor(() => state.users[0].wpm === 60);
    resumed.emit('finishGame', { roomId, userId: 'a' }); b.emit('finishGame', { roomId, userId: 'b' });
    await waitFor(() => state.progress === 'finished');
    assert.ok(state.users[0].speedHistory.length > 0);
    assert.ok(state.users[0].finishSeconds >= 0);
    resumed.emit('resetGame', { roomId });
    await waitFor(() => state.progress === 'waiting');
    assert.ok(state.users.every((u: any) => !u.finished && u.wpm === 0));
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise<void>(resolve => server.io.close(() => resolve()));
  }
});
