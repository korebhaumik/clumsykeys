import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRaceSettings, defaultRaceSettings, raceLanguages } from '../../backend/src/race.settings';
import { makeRacePassage, standardPassage } from '../../backend/src/race.passage';

test('settings accept valid changes without mutation and reject malformed, unknown, or unchanged values', () => {
  for (const patch of [null, [], 'words', { mode: 'invalid' }, { duration: 1 }, { wordCount: 0 }, { numbers: 1 }, { extra: true }, {}]) {
    assert.equal(applyRaceSettings(defaultRaceSettings, patch), undefined);
  }
  assert.deepEqual(applyRaceSettings(defaultRaceSettings, { mode: 'words', numbers: true }), { ...defaultRaceSettings, mode: 'words', numbers: true });
  assert.equal(defaultRaceSettings.mode, 'passage');
});

test('passage generation honors language, count, punctuation, numbers and timed length', () => {
  assert.equal(makeRacePassage(defaultRaceSettings), standardPassage);
  for (const language of Object.keys(raceLanguages) as (keyof typeof raceLanguages)[]) {
    const words = makeRacePassage({ ...defaultRaceSettings, language, mode: 'words', wordCount: 25, numbers: true, punctuation: false }).split(' ');
    assert.equal(words.length, 25);
    assert.ok(words.every(word => /^[a-z]+$|^\d{2}$/i.test(word)));
    assert.match(words[2], /^\d{2}$/);
  }
  assert.equal(makeRacePassage({ ...defaultRaceSettings, mode: 'time', duration: 15 }).split(' ').length, 75);
  assert.ok(makeRacePassage({ ...defaultRaceSettings, mode: 'quotes' }).length > 0);
});
