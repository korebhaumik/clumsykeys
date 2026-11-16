import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePersonalBests, recordPersonalBest, personalBestCategoryLabel, type PersonalBests } from '../../src/lib/features/practice/personal-best';
import { parsePracticeCategory, practiceCategory, practiceCategoryKey, type PracticeCategory } from '../../backend/src/practice-category.contract';
import { parsePractice } from '../../backend/src/persistence.contract';

const english30: PracticeCategory = { mode: 'prose', language: 'english', test: 'time', length: 30 };
const english60: PracticeCategory = { ...english30, length: 60 };
const english2k25: PracticeCategory = { mode: 'prose', language: 'english 2k', test: 'words', length: 25 };

test('each language, format and length has its own PB; first results and ties never win', () => {
  const bests: PersonalBests = {};
  assert.equal(recordPersonalBest(bests, english30, 60), undefined);
  assert.equal(recordPersonalBest(bests, english30, 60), undefined);
  assert.equal(recordPersonalBest(bests, english30, 59), undefined);
  assert.equal(recordPersonalBest(bests, english60, 30), undefined);
  assert.equal(recordPersonalBest(bests, english2k25, 40), undefined);
  assert.deepEqual(recordPersonalBest(bests, english30, 72), { category: english30, previous: 60, wpm: 72 });
  assert.deepEqual(recordPersonalBest(bests, english60, 35), { category: english60, previous: 30, wpm: 35 });
  assert.deepEqual(recordPersonalBest(bests, english2k25, 45), { category: english2k25, previous: 40, wpm: 45 });
  assert.equal(Object.keys(bests).length, 3);
});

test('code languages, keyword limits and snippet lengths are independent, including zero WPM', () => {
  const bests: PersonalBests = {};
  const snippets: PracticeCategory = { mode: 'code-snippets', language: 'randomPy', test: 'snippets', length: 'short' };
  assert.equal(recordPersonalBest(bests, snippets, 0), undefined);
  assert.deepEqual(recordPersonalBest(bests, snippets, 10), { category: snippets, previous: 0, wpm: 10 });
  for (const category of [{ ...snippets, length: 'medium' as const }, { ...snippets, language: 'randomJs' },
    { mode: 'code-keywords' as const, language: 'randomPy', test: 'words' as const, length: 25 }]) {
    assert.equal(recordPersonalBest(bests, category, 30), undefined);
  }
  assert.equal(Object.keys(bests).length, 4);
});

test('category normalization uses only the active limit and known quote defaults', () => {
  assert.deepEqual(practiceCategory({ mode: 'prose', language: 'english', settings: { timer: 30, words: null, quotes: null } }), english30);
  assert.deepEqual(practiceCategory({ mode: 'prose', language: 'english', settings: { quotes: 'Random Quotes', words: null, timer: null } }), { ...english30, test: 'quotes', length: 'medium' });
  assert.deepEqual(practiceCategory({ mode: 'code-snippets', language: 'randomPy', settings: { snippetLength: 'long', limit: { type: 'words', value: 25 } } }), { mode: 'code-snippets', language: 'randomPy', test: 'snippets', length: 'long' });
  assert.equal(practiceCategory({ mode: 'code-snippets', language: 'randomPy', settings: { limit: { type: 'words', value: 25 } } }), undefined);
  assert.deepEqual(parsePracticeCategory({ ...english30, length: '30' }), english30);
  for (const bad of [{ ...english30, length: 0 }, { ...english30, length: '30,or.evil' }, { ...english30, language: 'randomPy' }, { ...english30, test: 'snippets' }]) assert.equal(parsePracticeCategory(bad), undefined);
  assert.equal(personalBestCategoryLabel(english30), 'English · 30s');
  assert.equal(personalBestCategoryLabel(english2k25), 'English 2k · 25 words');
});

test('versioned storage rejects legacy aggregates, malformed categories and nonfinite scores', () => {
  const key = practiceCategoryKey(english30);
  for (const value of [null, 'bad', 100, [], { prose: 60 }, { version: 2, bests: { unknown: 99, [key]: Infinity } }]) assert.deepEqual(parsePersonalBests(value), {});
  assert.deepEqual(parsePersonalBests({ version: 2, bests: { [key]: 60, ignored: 99 } }), { [key]: 60 });
  const bests = { [key]: 10 };
  for (const value of [NaN, Infinity, -1]) assert.equal(recordPersonalBest(bests, english30, value), undefined);
  assert.equal(bests[key], 10);
});

test('snippet result length survives canonical validation; older saved results remain readable', () => {
  const result = { id: '12345678-1234-4234-8234-123456789abc', mode: 'code-snippets', language: 'randomPy', settings: {
    mode: 'snippets', language: 'randomPy', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false }, autoTabs: true,
  }, stats: { correct: 40, incorrect: 0, extra: 0, elapsedSeconds: 10, samples: [], history: [] } };
  assert.ok(parsePractice(result));
  assert.equal((parsePractice({ ...result, settings: { ...result.settings, snippetLength: 'short' } })!.settings as Record<string, unknown>).snippetLength, 'short');
  assert.equal(parsePractice({ ...result, settings: { ...result.settings, snippetLength: 'fake' } }), undefined);
});
