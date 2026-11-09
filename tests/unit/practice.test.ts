import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPracticeSession } from '../../src/lib/features/practice/session';
import { parseSnippet, langData, languages } from '../../src/lib/features/practice/code-snippets';
import { smoothPath } from '../../src/lib/components/charts/result-chart';

test('an empty session has finite metrics and no history', () => {
  const result = createPracticeSession().finish();
  assert.equal(result.accuracy, 100);
  assert.equal(result.wpm, 0);
  assert.equal(result.raw, 0);
  assert.equal(result.deviation, 0);
  assert.deepEqual(result.samples, []);
  assert.deepEqual(result.history, []);
});

test('session preserves four-character WPM, errors, idle seconds, and unique corrected positions', (t) => {
  let now = 1000;
  t.mock.method(performance, 'now', () => now);
  const session = createPracticeSession();
  session.record('correct', 'hi', '0', 0);
  now += 1000;
  session.record('incorrect', 'hi', '0', 1);
  now += 1000;
  session.record('correct', 'hi', '0', 1);
  now += 1000;
  session.record('extra', 'hi', '0', 2);
  now += 1000;
  session.record('correct', 'hi', '0', 1);
  now += 1000;
  const result = session.finish();
  assert.equal(result.wpm, 9);
  assert.equal(result.raw, 15);
  assert.equal(result.accuracy, 60);
  assert.deepEqual(result.history, [{ word: 'hi', wpm: 7, errors: 2 }]);
  assert.equal(result.samples.reduce((sum, p) => sum + p.errors, 0), 2);
  assert.ok(result.samples.every(p => Number.isFinite(p.wpm)));
});

test('snippet parser preserves empty words and indentation for every supported language', () => {
  assert.deepEqual(Object.keys(langData), Object.keys(languages));
  assert.deepEqual(parseSnippet(['\t\tif  x:', '']), [
    { content: ['if', '', 'x:'], indents: 2, index: 0 },
    { content: [''], indents: 0, index: 1 },
  ]);
  for (const snippets of Object.values(langData)) {
    assert.ok(snippets.length);
    for (const lines of snippets) assert.equal(parseSnippet(lines).length, lines.length);
  }
});

test('chart paths handle empty, single, repeated x, and turning points without NaN', () => {
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([{ x: 2, y: 3 }]), 'M 2 3');
  const path = smoothPath([{ x: 0, y: 0 }, { x: 3, y: 9 }, { x: 6, y: 0 }]);
  assert.match(path, /2 9 3 9 C 4 9/);
  assert.doesNotMatch(smoothPath([{ x: 0, y: 1 }, { x: 0, y: 2 }]), /NaN|Infinity/);
});
