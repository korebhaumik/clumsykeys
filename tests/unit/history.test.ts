import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PracticeSummary, RaceResult } from '../../backend/src/persistence.contract';
import { historyCsv, modeLabel, savedRaceSettings, selectHistory } from '../../src/lib/features/history/history';

const now = Date.parse('2026-11-14T12:00:00Z');
const practice = (overrides: Partial<PracticeSummary> = {}): PracticeSummary => ({
  id: 'first', user_id: 'owner', mode: 'prose', language: 'english', settings: { timer: 15 },
  created_at: '2026-11-14T10:00:00Z', correct: 90, incorrect: 1, extra: 0,
  wpm: 89, raw: 90, accuracy: 98.9, deviation: 8, elapsed_seconds: 15, metric_version: 1, ...overrides,
});
const race: RaceResult = { account_id: 'owner', accuracy: 95, created_at: '2026-11-14T11:00:00Z', finish_seconds: 20,
  participant_id: 'participant', racer_id: 'racer', reason: 'completed', round_id: 'round', speed_history: [], typed_chars: 100, username: 'Ada', wpm: 75 };
const filters = { mode: '', language: '', days: 0 };

test('history combines mode, language and rolling period filters without mutating loaded rows', () => {
  const rows = [practice(), practice({ id: 'code', mode: 'code-snippets', language: 'randomPy', settings: { limit: { type: 'words', value: 25 } } }), practice({ id: 'old', created_at: '2026-10-01T00:00:00Z' })];
  assert.equal(selectHistory(rows, { mode: 'code-snippets', language: 'randomPy', days: 7 }, 'created_at', false, now)[0]?.id, 'code');
  assert.equal(selectHistory(rows, { ...filters, days: 7 }, 'created_at', false, now).length, 2);
  assert.equal(selectHistory(rows, { ...filters, language: 'missing' }, 'wpm', false, now).length, 0);
  assert.deepEqual(rows.map(row => row.id), ['first', 'code', 'old']);
  assert.equal(modeLabel(rows[1]), 'Code snippets · 25 words');
});

test('history sorts metrics in either direction, breaks ties by date and supports races', () => {
  const rows = [practice(), practice({ id: 'faster', wpm: 120 }), practice({ id: 'older', created_at: '2026-11-13T10:00:00Z' })];
  assert.deepEqual(selectHistory(rows, filters, 'wpm', false).map(row => row.id), ['faster', 'first', 'older']);
  assert.equal(selectHistory(rows, filters, 'wpm', true)[0]?.id, 'first');
  assert.equal(selectHistory([race], filters, 'accuracy', false).length, 1);
  assert.equal(selectHistory([race], { ...filters, language: 'english' }, 'wpm', false).length, 0);
});

test('CSV exports only supplied results, escapes stored strings and leaves unavailable race metrics empty', () => {
  const csv = historyCsv([practice({ language: '=HYPERLINK("bad")' }), race]);
  assert.equal(csv.split('\r\n').length, 3);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"75","","95","","100","","","Multiplayer · completed",""'));
  assert.ok(csv.includes('"2026-11-14T10:00:00Z"'));
});


test('saved race configuration displays archived values and only the active limit', () => {
  const settings = { mode: 'time', language: 'hinglish', duration: 60, wordCount: 100, punctuation: false, numbers: true };
  assert.deepEqual(savedRaceSettings(settings), [
    { label: 'Mode', value: 'Time' }, { label: 'Language', value: 'Hinglish' },
    { label: 'Time limit', value: '60 seconds' }, { label: 'Punctuation', value: 'Off' }, { label: 'Numbers', value: 'On' },
  ]);
  const words = savedRaceSettings({ ...settings, mode: 'words', language: 'english-2k' });
  assert.ok(words.some(field => field.label === 'Word count' && field.value === '100 words'));
  assert.ok(words.some(field => field.label === 'Language' && field.value === 'English 2k'));
  assert.ok(!words.some(field => field.label === 'Time limit'));
  for (const mode of ['quotes', 'passage']) assert.equal(savedRaceSettings({ ...settings, mode }).length, 4);
});

test('missing or malformed archived settings never become current lobby defaults', () => {
  for (const settings of [null, undefined, [], {}, 'invalid']) assert.deepEqual(savedRaceSettings(settings), []);
  const partial = savedRaceSettings({ mode: 'time', duration: 0, language: 'constructor', punctuation: 'false' });
  assert.equal(partial[0].value, 'Time');
  assert.ok(partial.slice(1).every(field => field.value === 'Unavailable'));
  assert.equal(savedRaceSettings({ mode: 'constructor' })[0].value, 'Unavailable');
});
