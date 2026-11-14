import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterQuery, languageOptions, lengthOptions, pageSize, parseFilters, rankScores, testOptions, updateFilters, type SoloScore } from '../../src/lib/features/leaderboards/leaderboard';
import { leaderboardService, previewUserId } from '../fixtures/leaderboard-service';
import { codeLanguages as languages } from '../../shared/content/code-catalog';
import { practiceDurations, practiceWordCounts, proseLanguages } from '../../src/lib/features/practice/practice-options';

const now = Date.parse('2026-11-13T12:00:00Z');
const filters = parseFilters('');
const score = (overrides: Partial<SoloScore> = {}): SoloScore => ({ id: 'a', userId: 'a', username: 'A', mode: 'prose', language: filters.language, test: 'time', length: 30, wpm: 100, raw: 103, accuracy: 99, deviation: 3, correct: 200, incorrect: 2, extra: 0, date: new Date(now - 1000).toISOString(), ...overrides });

test('catalogs and test lengths follow solo practice choices', () => {
  assert.deepEqual(languageOptions('prose'), proseLanguages.map(({ value, label }) => ({ value, label })));
  assert.deepEqual(languageOptions('dev'), Object.entries(languages).map(([value, label]) => ({ value, label })));
  for (const mode of ['prose', 'dev'] as const) for (const { value } of testOptions(mode)) {
    const lengths = lengthOptions(value).map(option => option.value);
    assert.deepEqual(lengths, value.endsWith('time') ? [...practiceDurations] : value.endsWith('words') ? [...practiceWordCounts] : [0]);
  }
});
test('URL state round trips and rejects incompatible or malformed values', () => {
  const state = parseFilters('mode=dev&language=randomJs&test=keywords-words&length=100&range=week&page=3');
  assert.deepEqual(parseFilters(filterQuery(state)), state);
  for (const page of ['-2', '2.5', 'Infinity', 'NaN', '9007199254740992']) assert.equal(parseFilters(`page=${page}`).page, 1);
  assert.equal(parseFilters('page=9999999').page, 1_000_000);
  const invalid = parseFilters('mode=dev&language=hinglish&test=time&length=999&range=oops');
  assert.equal(invalid.language, Object.keys(languages)[0]); assert.equal(invalid.test, 'snippets'); assert.equal(invalid.length, 0); assert.equal(invalid.range, 'all');
  const quote = parseFilters('test=quotes&language=hinglish&length=60');
  assert.equal(quote.language, 'english'); assert.equal(quote.length, 0);
});
test('mode and format changes reset incompatible choices and pagination', () => {
  const before = parseFilters('language=hinglish&range=day&page=3');
  const dev = updateFilters(before, { mode: 'dev' });
  assert.equal(dev.page, 1); assert.equal(dev.range, 'day'); assert.equal(dev.length, 0);
  const timed = updateFilters(dev, { test: 'keywords-time' }); assert.equal(timed.length, 30);
  assert.equal(updateFilters(timed, { test: 'keywords-words' }).length, 25);
  assert.equal(updateFilters(timed, { page: 2 }).page, 2);
});
test('ranking filters before selecting each player best and uses deterministic tie breaks', () => {
  const ranked = rankScores([
    score({ id: 'high-old', wpm: 200, date: new Date(now - 40 * 86_400_000).toISOString() }),
    score({ id: 'low-new', wpm: 90 }), score({ id: 'b', userId: 'b', accuracy: 98 }),
    score({ id: 'c', userId: 'c', date: new Date(now - 2000).toISOString() }),
    score({ id: 'd', userId: 'd' }), score({ id: 'foreign', userId: 'e', language: 'hinglish', wpm: 300 }),
    score({ id: 'format', userId: 'f', test: 'words', wpm: 300 }),
    score({ id: 'length', userId: 'g', length: 60, wpm: 300 }),
    score({ id: 'future', userId: 'h', date: new Date(now + 1000).toISOString() }),
    score({ id: 'invalid', userId: 'i', accuracy: 101 }), score({ id: 'nan', userId: 'j', wpm: NaN }),
    score({ id: 'dev', userId: 'k', mode: 'dev', wpm: 300 }),
  ], { ...filters, range: 'month' }, 'a', now);
  assert.deepEqual(ranked.rows.map(row => [row.id, row.rank]), [['c', 1], ['d', 2], ['b', 3], ['low-new', 4]]);
  assert.equal(ranked.currentUser?.rank, 4);
});
test('rolling ranges include their boundary, pagination pins the viewer and clamps stale pages', () => {
  const rows = Array.from({ length: 24 }, (_, index) => score({ id: String(index), userId: String(index), wpm: 120 - index }));
  const ranked = rankScores(rows, filters, '23', now);
  assert.equal(ranked.rows.length, pageSize); assert.equal(ranked.currentUser?.rank, 24); assert.equal(ranked.pages, 3);
  const last = rankScores(rows, { ...filters, page: 999 }, '23', now);
  assert.equal(last.page, 3); assert.equal(last.rows.length, 4);
  const edge = score({ date: new Date(now - 86_400_000).toISOString() });
  assert.equal(rankScores([edge], { ...filters, range: 'day' }, null, now).total, 1);
  assert.equal(rankScores([edge], { ...filters, range: 'day' }, null, now + 1).total, 0);
  assert.deepEqual(rankScores([], filters, 'missing', now), { rows: [], currentUser: null, total: 0, page: 1, pages: 1 });
});
test('demo adapter supplies an explicit preview identity and supports cancellation and errors', async () => {
  const result = await leaderboardService.read(filters, previewUserId, new AbortController().signal);
  assert.equal(result.currentUser?.rank, 18); assert.equal(result.total, 34);
  const real = await leaderboardService.read(filters, 'real-account', new AbortController().signal);
  assert.equal(real.currentUser, null);
  const controller = new AbortController();
  const pending = leaderboardService.read(filters, null, controller.signal); controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(leaderboardService.read(filters, null, controller.signal), { name: 'AbortError' });
  await assert.rejects(leaderboardService.read({ ...filters, language: 'unknown' }, null, new AbortController().signal), /unavailable/);
});
