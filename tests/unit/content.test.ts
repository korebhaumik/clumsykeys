import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codeLanguageChoices, snippetLengths } from '../../shared/content/code-catalog';
import { snippetCatalog } from '../../shared/content/snippet-catalog';
import { keywordCatalog } from '../../shared/content/keyword-catalog';
import { proseCatalog } from '../../shared/content/prose-catalog';
import { quoteCatalog } from '../../shared/content/quote-catalog';
import { sampleCycle, sampleWords } from '../../shared/content/sampling';
import { generateTokens } from '../../shared/content/passages';
import { drawSnippet } from '../../shared/content/snippets';
import { makeProsePassage } from '../../src/lib/features/practice/prose-passage';
import { drawCodeKeywords } from '../../src/lib/features/practice/code-keywords';
import type { TestConfig } from '../../src/lib/features/settings/settings.store';

const config: TestConfig = {
  language: 'english 2k', words: 25, timer: null, quotes: null,
  numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null },
};

test('catalogs retain known sizes, complete snippets, metadata and stable unique IDs', () => {
  assert.deepEqual(Object.values(proseCatalog).map(catalog => catalog.words.length), [200, 997, 2000, 4929, 207]);
  assert.equal(quoteCatalog.length, 146);
  assert.equal(snippetCatalog.length, 120);
  assert.equal(new Set(snippetCatalog.map(snippet => snippet.id)).size, snippetCatalog.length);
  for (const language of codeLanguageChoices) {
    assert.equal(snippetCatalog.filter(snippet => snippet.language === language).length, 20);
    const catalog = keywordCatalog[language];
    assert.ok(catalog.words.length >= 25);
    assert.ok(catalog.words.every(word => word.length && !/\s/.test(word)));
    assert.ok(catalog.source.description.length);
    for (const length of snippetLengths) {
      const matches = snippetCatalog.filter(snippet => snippet.language === language && snippet.length === length);
      assert.equal(matches.length, length === "long" ? 6 : 7, `${language}/${length} has balanced coverage`);
      for (const snippet of matches) {
        assert.ok(snippet.id.length && snippet.source.description.length && snippet.lines.length);
        assert.ok(snippet.lines.every(line => typeof line === 'string' && !line.includes('\n')));
      }
    }
  }
});

test('sampling is deterministic, non-mutating and handles repeated vocabulary cycles', () => {
  const words = ['first', 'second', 'third'];
  assert.deepEqual(sampleWords(words, 5, () => 0), ['first', 'second', 'first', 'second', 'first']);
  assert.deepEqual(sampleWords(['only'], 3, () => 0), ['only', 'only', 'only']);
  assert.deepEqual(sampleCycle(words, 8, () => 0), ['first', 'second', 'third', 'first', 'second', 'third', 'first', 'second']);
  assert.deepEqual(words, ['first', 'second', 'third']);
  assert.throws(() => sampleCycle([], 1), /empty/);
  assert.throws(() => sampleWords([], 1), /empty/);
  for (const language of codeLanguageChoices) {
    const list = keywordCatalog[language].words;
    const snapshot = [...list];
    const result = sampleCycle(list, list.length * 2, length => length - 1);
    assert.equal(new Set(result.slice(0, list.length)).size, list.length);
    assert.equal(new Set(result.slice(list.length)).size, list.length);
    assert.deepEqual(list, snapshot);
  }
});

test('snippet redraw respects authored category and excludes the previous ID when possible', () => {
  const snapshot = JSON.stringify(snippetCatalog);
  for (const language of codeLanguageChoices) for (const length of snippetLengths) {
    const matches = snippetCatalog.filter(snippet => snippet.language === language && snippet.length === length);
    const first = drawSnippet(language, length, undefined, () => 0);
    const last = drawSnippet(language, length, undefined, count => count - 1);
    assert.equal(first.id, matches[0].id);
    assert.equal(last.id, matches.at(-1)!.id);
    const next = drawSnippet(language, length, first.id, () => 0);
    assert.equal(next.language, language);
    assert.equal(next.length, length);
    if (matches.length > 1) assert.notEqual(first.id, next.id);
    else assert.equal(first.id, next.id);
  }
  assert.equal(JSON.stringify(snippetCatalog), snapshot);
});

test('solo adapters preserve limits, difficulty modifiers and full quote text', () => {
  for (const language of ['english', 'english 1k', 'english 2k', 'english 5k', 'hinglish'] as const) {
    const plain = makeProsePassage({ ...config, language }, () => 0);
    assert.equal(plain.length, 25);
    assert.ok(plain.every(word => /^[a-z]+$/i.test(word)));
  }
  assert.equal(makeProsePassage({ ...config, words: null, timer: 15 }, () => 0).length, 75);
  for (const level of ['easy', 'mid', 'hard', 'insane'] as const) {
    const result = makeProsePassage({ ...config, words: 50, numbers: level, punctuations: level }, () => 0);
    assert.equal(result.length, 50);
    assert.ok(result.some(word => /^\d{2}/.test(word)));
    assert.ok(result.some(word => /[^a-z\d]/i.test(word)));
  }
  const quote = quoteCatalog[0].text.trim().split(/\s+/);
  assert.deepEqual(makeProsePassage({ ...config, quotes: 'Random Quotes', quoteLength: 'short', punctuations: 'easy' }, () => 0), quote);
  const numbered = makeProsePassage({ ...config, quotes: 'Random Quotes', quoteLength: 'short', punctuations: 'easy', numbers: 'easy' }, () => 0);
  // Insertion must not truncate the final words, even if the quote exceeds the word preset.
  assert.deepEqual(numbered.filter(word => word !== '10'), quote);
  assert.ok(numbered.includes('10'));
});

test('keyword modifiers preserve token counts and the race formatting policy stays distinct', () => {
  const keywords = drawCodeKeywords('randomPy', 25, { numbers: true, punctuation: true }, () => 0);
  assert.equal(keywords.length, 25);
  assert.equal(keywords[5], '10');
  assert.match(keywords[3], /,$/);
  assert.match(keywords[24], /,$/);
  const race = generateTokens({
    source: { kind: 'prose', language: 'english', count: 25 },
    modifiers: { numbers: { every: 8, placement: 'replace', offset: 2 }, punctuation: { every: 8, marks: ',', final: '.' } },
  }, () => 0);
  assert.equal(race.length, 25);
  assert.equal(race[2], '10');
  assert.equal(race[10], '10');
  assert.match(race[7], /,$/);
  assert.match(race[24], /\.$/);
});

test('quote length filters preserve full text, modifier behavior and pool boundaries', async () => {
  const { quoteLengths, quoteLengthOf } = await import('../../shared/content/quote-length');
  const { drawQuote } = await import('../../shared/content/passages');
  assert.equal(quoteLengthOf('x'.repeat(100)), 'short');
  assert.equal(quoteLengthOf('x'.repeat(101)), 'medium');
  assert.equal(quoteLengthOf('x'.repeat(300)), 'medium');
  assert.equal(quoteLengthOf('x'.repeat(301)), 'long');
  for (const length of quoteLengths) {
    const pool = quoteCatalog.filter(quote => quote.category === length);
    assert.ok(pool.length);
    for (let index = 0; index < pool.length; index++) {
      assert.equal(drawQuote(true, () => index, length).join(' '), pool[index].text.trim().replace(/\s+/g, ' '));
    }
    const selected = makeProsePassage({ ...config, quotes: 'Random Quotes', quoteLength: length, punctuations: 'easy' }, () => 0);
    assert.equal(selected.join(' '), pool[0].text.trim().replace(/\s+/g, ' '));
  }
  const medium = makeProsePassage({ ...config, quotes: 'Random Quotes', punctuations: 'easy' }, () => 0);
  assert.equal(quoteLengthOf(medium.join(' ')), 'medium');
});

test('quote length round trips through preferences and result validation, with legacy compatibility', async () => {
  const { parsePreferences, parsePractice } = await import('../../backend/src/persistence.contract');
  const preferences = { version: 1, theme: 'classic', prose: { ...config, words: null, quotes: 'Random Quotes' },
    code: { mode: 'snippets', language: 'randomPy', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false } } };
  assert.deepEqual(parsePreferences(preferences), preferences);
  for (const quoteLength of ['short', 'medium', 'long']) {
    const prose = { ...preferences.prose, quoteLength };
    assert.equal(parsePreferences({ ...preferences, prose })?.prose.quoteLength, quoteLength);
    const result = parsePractice({ id: '12345678-1234-4234-8234-123456789abc', mode: 'prose', language: prose.language, settings: prose,
      stats: { correct: 40, incorrect: 0, extra: 0, elapsedSeconds: 10, samples: [], history: [] } });
    assert.equal((result?.settings as Record<string, unknown>)?.quoteLength, quoteLength);
  }
  for (const quoteLength of ['random', '', null, 100]) assert.equal(parsePreferences({ ...preferences, prose: { ...preferences.prose, quoteLength } }), undefined);
});
