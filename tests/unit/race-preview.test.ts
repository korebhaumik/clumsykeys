import assert from 'node:assert/strict';
import { test } from 'node:test';
import { racePreviewFrame, racePreviewDuration } from '../../src/lib/features/multiplayer/race-preview';

test('scripted racers trade the lead and both finish the same phrase', () => {
  assert.deepEqual(racePreviewFrame(0).players.map(player => player.count), [0, 0]);
  const early = racePreviewFrame(4200).players;
  assert.ok(early[1].count > early[0].count);
  const late = racePreviewFrame(7000).players;
  assert.ok(late[0].count > late[1].count);
  for (let cycle = 0; cycle < 3; cycle++) {
    const finish = racePreviewFrame(cycle * racePreviewDuration + 10400);
    assert.ok(finish.players.every(player => player.count === finish.phrase.length && !player.mistake));
  }
});

test('Lin makes a mistake, backspaces and correctly retypes the character', () => {
  const mistake = racePreviewFrame(4900).players[1];
  assert.equal(mistake.mistake, true);
  const backspace = racePreviewFrame(5200).players[1];
  assert.equal(backspace.count, mistake.count - 1);
  assert.equal(backspace.mistake, false);
  const corrected = racePreviewFrame(5600).players[1];
  assert.ok(corrected.count >= mistake.count);
  assert.equal(corrected.mistake, false);
});

test('finished phrases fade out, reset and rotate on a repeatable loop', () => {
  assert.equal(racePreviewFrame(11800).opacity, 0);
  assert.deepEqual(racePreviewFrame(racePreviewDuration).players.map(player => player.count), [0, 0]);
  assert.notEqual(racePreviewFrame(0).phrase, racePreviewFrame(racePreviewDuration).phrase);
  assert.deepEqual(racePreviewFrame(4200), racePreviewFrame(racePreviewDuration * 3 + 4200));
  for (let time = 0; time < racePreviewDuration * 3; time += 50) {
    const frame = racePreviewFrame(time);
    assert.ok(frame.opacity >= 0 && frame.opacity <= 1);
    assert.ok(frame.players.every(player => player.count >= 0 && player.count <= frame.phrase.length));
  }
});
