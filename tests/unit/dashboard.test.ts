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
