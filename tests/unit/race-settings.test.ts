import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRaceSettings, defaultRaceSettings, raceLanguages } from '../../backend/src/race.settings';
import { makeRacePassage } from '../../backend/src/race.passage';
import { drawQuote, drawWords } from '../../shared/content/passages';
import englishQuotes from '../../shared/content/data/prose/english_quotes.json';
import english from '../../shared/content/data/prose/english.json';
import english1k from '../../shared/content/data/prose/english_1k.json';

test('settings accept valid changes without mutation and reject malformed, unknown, or unchanged values', () => {
  for (const patch of [null, [], 'words', { mode: 'invalid' }, { duration: 1 }, { wordCount: 0 }, { numbers: 1 }, { extra: true }, {}]) {
    assert.equal(applyRaceSettings(defaultRaceSettings, patch), undefined);
  }
  assert.deepEqual(applyRaceSettings(defaultRaceSettings, { mode: 'words', numbers: true }), { ...defaultRaceSettings, mode: 'words', numbers: true });
  assert.equal(defaultRaceSettings.mode, 'passage');
});

test('passage generation honors language, count, punctuation, numbers and timed length', () => {
  const passage = makeRacePassage(defaultRaceSettings);
  assert.equal(passage.split(' ').length, 9);
  assert.ok(passage.slice(0, -1).split(' ').every(word => english.words.includes(word.replace(/,$/, ''))));
  for (const language of Object.keys(raceLanguages) as (keyof typeof raceLanguages)[]) {
    const words = makeRacePassage({ ...defaultRaceSettings, language, mode: 'words', wordCount: 25, numbers: true, punctuation: false }).split(' ');
    assert.equal(words.length, 25);
    assert.ok(words.every(word => /^[a-z]+$|^\d{2}$/i.test(word)));
    assert.match(words[2], /^\d{2}$/);
  }
  assert.equal(makeRacePassage({ ...defaultRaceSettings, mode: 'time', duration: 15 }).split(' ').length, 75);
  assert.ok(makeRacePassage({ ...defaultRaceSettings, mode: 'quotes' }).length > 0);
});

test('dataset sampling reaches the whole list and preserves quote text', () => {
  assert.deepEqual(drawWords('english-1k', 2, length => length - 1), english1k.words.slice(-2).reverse());
  const lastQuote = englishQuotes.quotes.at(-1)!.text;
  assert.equal(drawQuote(true, length => length - 1).join(' '), lastQuote.trim().replace(/\s+/g, ' '));
  assert.ok(drawQuote(false, () => 0).every(word => /^[\p{L}\p{M}\p{N}]+$/u.test(word)));
});
