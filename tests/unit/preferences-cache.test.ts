import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountPreferencesKey, guestPreferencesKey, cacheAccountPreferences, cacheGuestPreferences, readAccountPreferences, readGuestPreferences } from '../../src/lib/features/settings/preferences-cache';
import type { Preferences } from '../../backend/src/persistence.contract';

const preferences: Preferences = { version: 1, theme: 'classic',
  prose: { punctuations: 'easy', numbers: null, language: 'hinglish', timer: null, words: 100, quotes: null,
    quoteLength: 'long', difficulty: { wpmLimit: null, timeLimit: null } },
  code: { mode: 'keywords', language: 'randomTs', limit: { type: 'time', value: 60 }, modifiers: { numbers: true, punctuation: false } } };
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
test('preference caches preserve independent guest and account settings with their sync baseline', () => {
  const local = storage();
  cacheGuestPreferences(local, preferences);
  cacheAccountPreferences(local, { accountId: 'owner', preferences, synced: { ...preferences, theme: 'dark-forest' }, revision: 4 });
  assert.deepEqual(readGuestPreferences(local), preferences);
  assert.deepEqual(readAccountPreferences(local, 'owner'), { accountId: 'owner', preferences, synced: { ...preferences, theme: 'dark-forest' }, revision: 4 });
  assert.equal(readAccountPreferences(local, 'other-owner'), undefined);
});
test('malformed, unsupported, oversized and invalid caches fall back without trusting stored fields', () => {
  const local = storage();
  for (const value of ['broken', 'null', '[]', JSON.stringify({ ...preferences, version: 2 }), JSON.stringify({ ...preferences, prose: { ...preferences.prose, words: -1 } }), JSON.stringify({ ...preferences, theme: { toString: null } }), ' '.repeat(16_385)]) {
    local.setItem(guestPreferencesKey, value);
    assert.equal(readGuestPreferences(local), undefined);
  }
  for (const patch of [{ revision: -1 }, { revision: 1.5 }, { synced: {} }, { version: 2 }]) {
    local.setItem(accountPreferencesKey, JSON.stringify({ version: 1, accountId: 'owner', preferences, synced: preferences, revision: 1, ...patch }));
    assert.equal(readAccountPreferences(local, 'owner'), undefined);
  }
  local.setItem(guestPreferencesKey, JSON.stringify({ ...preferences, access_token: 'discard-this', prose: { ...preferences.prose, extra: 'discard-this' } }));
  assert.deepEqual(readGuestPreferences(local), preferences);
});
test('unavailable storage never prevents reading defaults or changing settings', () => {
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(readGuestPreferences(denied), undefined);
  assert.equal(readAccountPreferences(denied, 'owner'), undefined);
  assert.doesNotThrow(() => cacheGuestPreferences(denied, preferences));
  assert.doesNotThrow(() => cacheAccountPreferences(denied, { accountId: 'owner', preferences, synced: null, revision: null }));
});
