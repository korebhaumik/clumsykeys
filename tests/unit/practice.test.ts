import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPracticeSession } from '../../src/lib/features/practice/session';
import { parseSnippet } from '../../src/lib/features/practice/code-snippets';
import { codeLanguages as languages, codeLanguageChoices as languageChoices, snippetLengths } from '../../shared/content/code-catalog';
import { snippetCatalog } from '../../shared/content/snippet-catalog';
import { drawCodeKeywords } from '../../src/lib/features/practice/code-keywords';
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
  assert.deepEqual([...new Set(snippetCatalog.map(snippet => snippet.language))], Object.keys(languages));
  assert.deepEqual(parseSnippet(['\t\tif  x:', '']), [
    { content: ['if', '', 'x:'], indents: 2, index: 0 },
    { content: [''], indents: 0, index: 1 },
  ]);
  for (const snippet of snippetCatalog) assert.equal(parseSnippet(snippet.lines).length, snippet.lines.length);
});

test('snippet lengths partition every language into complete, progressively larger snippets', () => {
  for (const language of languageChoices) {
    const snippets = snippetCatalog.filter(snippet => snippet.language === language);
    const groups = snippetLengths.map(length => snippets.filter(snippet => snippet.length === length));
    assert.equal(new Set(groups.flat().map(snippet => snippet.id)).size, snippets.length, `${language} covers the catalog`);
    assert.equal(groups.flat().length, snippets.length, `${language} has disjoint groups`);
    let previousMax = 0;
    for (const group of groups) {
      assert.ok(group.length > 0);
      const sizes = group.map(snippet => snippet.lines.join('\n').length);
      assert.ok(Math.min(...sizes) > previousMax, `${language} lengths increase`);
      previousMax = Math.max(...sizes);
    }
  }
});

test('chart paths handle empty, single, repeated x, and turning points without NaN', () => {
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([{ x: 2, y: 3 }]), 'M 2 3');
  const path = smoothPath([{ x: 0, y: 0 }, { x: 3, y: 9 }, { x: 6, y: 0 }]);
  assert.match(path, /2 9 3 9 C 4 9/);
  assert.doesNotMatch(smoothPath([{ x: 0, y: 1 }, { x: 0, y: 2 }]), /NaN|Infinity/);
});

test('keyword draws provide distinct single tokens for every snippet language', () => {
  for (const language of Object.keys(languages) as (keyof typeof languages)[]) {
    const words = drawCodeKeywords(language);
    assert.equal(words.length, 25);
    assert.equal(new Set(words).size, words.length);
    assert.ok(words.every(word => /^[a-z_][a-z_0-9]*$/i.test(word)));
  }
});
