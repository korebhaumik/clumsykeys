import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeWebsite, typingTime } from '../../src/lib/features/auth/dashboard';

test('profile website rejects executable schemes and credential-bearing URLs', () => {
  for (const value of ['javascript://alert(1)', 'data://text/html', 'https://user:secret@example.com', null, '']) assert.equal(safeWebsite(value), null);
  assert.equal(safeWebsite('example.com/profile')?.href, 'https://example.com/profile');
  assert.equal(safeWebsite('https://example.com')?.hostname, 'example.com');
});
test('typing time retains hours beyond a day instead of wrapping', () => {
  assert.equal(typingTime(0), '00:00:00');
  assert.equal(typingTime(90061.9), '25:01:01');
});

import { displayName } from '../../src/lib/features/auth/display-name';
test('public names prefer explicit edits then OAuth names without exposing email addresses', () => {
  assert.equal(displayName({ display_name: '  Ada  ', full_name: 'Provider' }), 'Ada');
  assert.equal(displayName({ full_name: 'GitHub typist', user_name: 'handle' }), 'GitHub typist');
  assert.equal(displayName({ name: ' ', user_name: 'handle' }), 'handle');
  assert.equal(displayName({ display_name: 'private@example.com', full_name: 42, preferred_username: 'alias' }), 'alias');
  assert.equal(displayName({ email: 'private@example.com' }), '');
  assert.equal(Array.from(displayName({ name: 'a'.repeat(70) })).length, 50);
});

import { parseHandle } from '../../backend/src/persistence.contract';
test('handle input normalizes case and whitespace and rejects invalid public identifiers', () => {
  assert.equal(parseHandle('  Alex_Keys  '), 'alex_keys');
  for (const value of ['', 'ab', 'a'.repeat(25), '@alex', 'alex keys', 'alex.keys', 'áléx', null, 123]) assert.equal(parseHandle(value), null);
  assert.equal(parseHandle('a'.repeat(24)), 'a'.repeat(24));
});
