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
    const health = await fetch(url + '/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
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
    a.emit('finishGame', { roomId, userId: 'a' });
    a.emit('timeData', { roomId, userId: 'a', wpm: 60, typedChars: state.text.length + 1, accuracy: 100 });
    await delay(80); assert.equal(state.users[0].finished, false); assert.equal(state.users[0].typedChars, 0);
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
    resumed.emit('timeData', { roomId, userId: 'a', wpm: 60, typedChars: state.text.length, accuracy: 100 });
    b.emit('timeData', { roomId, userId: 'b', wpm: 60, typedChars: state.text.length, accuracy: 100 });
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

test('only the current host socket can end the matching round; recovery, replay and explicit host transfer stay safe', { timeout: 22000 }, async () => {
  const server = createApplication();
  server.httpServer.listen(0, '127.0.0.1');
  await once(server.httpServer, 'listening');
  const address = server.httpServer.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const clients = [io(url), io(url), io(url)];
  const [host, peer, stranger] = clients;
  const roomId = `end-race-${Date.now()}`;
  let state: any, token = '';
  try {
    await Promise.all(clients.map(socket => once(socket, 'connect')));
    peer.on('roomData', value => { state = value; });
    host.on('roomSession', value => { token = value.resumeToken; });
    const joined = once(host, 'roomData');
    host.emit('joinRoom', { roomId, userId: 'host', username: 'Host' });
    assert.equal((await joined)[0].hostUserId, 'host');
    peer.emit('joinRoom', { roomId, userId: 'peer', username: 'Peer' });
    await waitFor(() => state?.users.length === 2);
    host.emit('startVote', { roomId, userId: 'host' });
    peer.emit('startVote', { roomId, userId: 'peer' });
    await waitFor(() => state.progress === 'playing');
    const roundId = state.roundId, settings = { ...state.settings };
    for (const socket of [peer, stranger]) {
      const error = once(socket, 'error');
      socket.emit('endRace', { roomId, userId: 'host', roundId });
      assert.match((await error)[0].msg, /Only the room host/);
      assert.equal(state.progress, 'playing');
    }
    host.disconnect();
    const resumed = io(url); clients.push(resumed);
    await once(resumed, 'connect');
    const recovered = once(resumed, 'roomData');
    resumed.emit('joinRoom', { roomId, userId: 'host', username: 'Host', resumeToken: token });
    assert.equal((await recovered)[0].hostUserId, 'host');
    for (const payload of [null, {}, { roundId: 'stale' }]) {
      const error = once(resumed, 'error'); resumed.emit('endRace', payload);
      assert.match((await error)[0].msg, /no longer active/);
    }
    resumed.emit('timeData', { roomId, userId: 'host', wpm: 42, accuracy: 90, typedChars: 5 });
    await waitFor(() => state.users[0].wpm === 42);
    resumed.emit('endRace', { roundId });
    await waitFor(() => state.progress === 'waiting');
    assert.equal(state.roundId, null); assert.equal(state.startsAt, undefined);
    assert.deepEqual(state.settings, settings);
    assert.ok(state.users.every((r: any) => !r.vote && !r.finished && !r.isPlaying && r.typedChars === 0 && r.wpm === 0 && r.accuracy === 100));
    resumed.emit('startVote', { roomId, userId: 'host' });
    peer.emit('startVote', { roomId, userId: 'peer' });
    await waitFor(() => state.progress === 'playing');
    assert.notEqual(state.roundId, roundId);
    const stale = once(resumed, 'error'); resumed.emit('endRace', { roundId });
    assert.match((await stale)[0].msg, /no longer active/);
    assert.equal(state.progress, 'playing');
    await resumed.emitWithAck('leaveRoom');
    await waitFor(() => state.hostUserId === 'peer' && state.users.length === 1);
    assert.equal(state.progress, 'playing');
    peer.emit('endRace', { roundId: state.roundId });
    await waitFor(() => state.progress === 'waiting');
    await peer.emitWithAck('leaveRoom');
    assert.equal((await fetch(url + '/rooms?roomId=' + roomId)).status, 404);
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise<void>(resolve => server.io.close(() => resolve()));
  }
});
