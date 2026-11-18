import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRaceSettings, defaultRaceSettings, raceErrorsToCorrect, raceLanguages } from '../../backend/src/race.settings';
import { rankRaceResults } from '../../backend/src/race.scoring';
import { makeRacePassage } from '../../backend/src/race.passage';
import { drawQuote, drawWords } from '../../shared/content/passages';
import { quoteLengths } from '../../shared/content/quote-length';
import { quoteCatalog } from '../../shared/content/quote-catalog';
import englishQuotes from '../../shared/content/data/prose/english_quotes.json';
import english from '../../shared/content/data/prose/english.json';
import english1k from '../../shared/content/data/prose/english_1k.json';

test('settings accept valid changes without mutation and reject malformed, unknown, or unchanged values', () => {
  for (const patch of [null, [], 'words', { mode: 'invalid' }, { mode: 'passage' }, { duration: 1 }, { wordCount: 0 }, { numbers: 1 },
    { quoteLength: 'extra-long' }, { quoteLength: null }, { extra: true }, {},
    ...[4, 6, 9, 11, 14, 15.1, 16, '10', null].map(errorThreshold => ({ errorThreshold }))]) {
    assert.equal(applyRaceSettings(defaultRaceSettings, patch), undefined);
  }
  assert.deepEqual(applyRaceSettings(defaultRaceSettings, { mode: 'words', numbers: true }), { ...defaultRaceSettings, mode: 'words', numbers: true });
  assert.deepEqual(defaultRaceSettings, { mode: 'words', language: 'english', duration: 30, wordCount: 25,
    quoteLength: 'medium', punctuation: true, numbers: false, errorThreshold: 5 });
  assert.equal(applyRaceSettings(defaultRaceSettings, { mode: 'time', errorThreshold: 10 })?.errorThreshold, 10);
  assert.equal(applyRaceSettings(defaultRaceSettings, { errorThreshold: 15 })?.errorThreshold, 15);
});

test('error budget floors the passage allowance and includes remaining extra characters', () => {
  assert.equal(raceErrorsToCorrect(39, 38, 0, 5), 0);
  assert.equal(raceErrorsToCorrect(39, 38, 1, 5), 1);
  assert.equal(raceErrorsToCorrect(100, 85, 0, 15), 0);
  assert.equal(raceErrorsToCorrect(100, 84, 0, 15), 1);
});

test('race placement uses composite score, accuracy, then finish time and shares exact ties', () => {
  const completed = { reason: 'completed', finishSeconds: 10 } as const;
  const results = rankRaceResults([
    { name: 'Faster', wpm: 100, accuracy: 92, ...completed },
    { name: 'More accurate', wpm: 95, accuracy: 98, ...completed },
    { name: 'Equal score', wpm: 92, accuracy: 100, ...completed },
    { name: 'Same pace', wpm: 92, accuracy: 100, ...completed },
    { name: 'Earlier', wpm: 92, accuracy: 100, ...completed, finishSeconds: 8 },
    { name: 'Left', wpm: 120, accuracy: 100, reason: 'disconnected', finishSeconds: null },
  ], true);
  assert.deepEqual(results.map(({ name, score, place }) => [name, score, place]), [
    ['More accurate', 93.1, 1], ['Earlier', 92, 2], ['Equal score', 92, 3], ['Same pace', 92, 3], ['Faster', 92, 5], ['Left', null, null],
  ]);
  assert.ok(rankRaceResults(results, false).every(racer => racer.score === null && racer.place === null));
});

test('passage generation honors language, count, punctuation, numbers and timed length', () => {
  const passage = makeRacePassage(defaultRaceSettings);
  assert.equal(passage.split(' ').length, 25);
  assert.ok(passage.slice(0, -1).split(' ').every(word => english.words.includes(word.replace(/,$/, ''))));
  for (const language of Object.keys(raceLanguages) as (keyof typeof raceLanguages)[]) {
    const words = makeRacePassage({ ...defaultRaceSettings, language, mode: 'words', wordCount: 25, numbers: true, punctuation: false }).split(' ');
    assert.equal(words.length, 25);
    assert.ok(words.every(word => /^[a-z]+$|^\d{2}$/i.test(word)));
    assert.match(words[2], /^\d{2}$/);
  }
  assert.equal(makeRacePassage({ ...defaultRaceSettings, mode: 'time', duration: 15 }).split(' ').length, 75);
});

test('multiplayer quote lengths select complete quotes from their original categories', () => {
  for (const quoteLength of quoteLengths) {
    const settings = applyRaceSettings(defaultRaceSettings, { mode: 'quotes', quoteLength })!;
    const quote = makeRacePassage(settings);
    assert.ok(quoteCatalog.some(entry => entry.category === quoteLength && entry.text.trim().replace(/\s+/g, ' ') === quote));
  }
});

test('dataset sampling reaches the whole list and preserves quote text', () => {
  assert.deepEqual(drawWords('english-1k', 2, length => length - 1), english1k.words.slice(-2).reverse());
  const lastQuote = englishQuotes.quotes.at(-1)!.text;
  assert.equal(drawQuote(true, length => length - 1).join(' '), lastQuote.trim().replace(/\s+/g, ' '));
  assert.ok(drawQuote(false, () => 0).every(word => /^[\p{L}\p{M}\p{N}]+$/u.test(word)));
});
