import { expect, test, type Page } from '@playwright/test';

async function chooseWords(page: Page, count: number) {
  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
  await dialog.getByRole('button', { name: 'Words', exact: true }).click();
  await dialog.getByRole('spinbutton', { name: 'Word count', exact: true }).fill(String(count));
  await dialog.getByRole('button', { name: 'Set words', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(count);
}
async function signIn(page: Page, email: string) {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
}
async function synced(page: Page) {
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`guest configuration survives a new tab in ${theme} at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/');
    await chooseWords(page, 100);
    const other = await context.newPage();
    await other.goto('/');
    await expect(other.locator('.typing-window .typing-word')).toHaveCount(100);
    await expect(other.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
    await page.goto('/#/game');
    await page.getByRole('group', { name: 'Snippet length', exact: true }).getByRole('button', { name: 'Long', exact: true }).click();
    await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Indentation', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Manual Tabs', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('group', { name: 'Snippet length', exact: true }).getByRole('button', { name: 'Long', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Indentation', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Manual Tabs', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('cached account configuration renders before a slow refresh and matching data keeps the passage', async ({ page }) => {
  await signIn(page, 'cache-startup@test.local');
  await page.goto('/'); await chooseWords(page, 100); await synced(page);
  const revision = await page.evaluate(() => JSON.parse(localStorage.getItem('clumsy-keys:account-preferences:v1')!).revision as number);
  const release = Promise.withResolvers<void>();
  await page.route('**/api/account', async route => {
    const response = await route.fetch();
    const body = await response.json();
    await release.promise;
    await route.fulfill({ response, json: { ...body, revision: revision + 1 } });
  });
  try {
    await page.goto('/');
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
    const passage = await page.locator('.typing-window').elementHandle();
    const word = await page.locator('.typing-window .typing-word').first().elementHandle();
    release.resolve();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('clumsy-keys:account-preferences:v1')!).revision)).toBe(revision + 1);
    expect(await passage!.evaluate(element => element.isConnected)).toBe(true);
    expect(await word!.evaluate(element => element.isConnected)).toBe(true);
  } finally { release.resolve(); }
});

test('uncached accounts wait for settings instead of drawing a default passage', async ({ page }) => {
  await signIn(page, 'cache-first-load@test.local');
  await page.goto('/'); await chooseWords(page, 50); await synced(page);
  await page.evaluate(() => localStorage.removeItem('clumsy-keys:account-preferences:v1'));
  const release = Promise.withResolvers<void>();
  await page.route('**/api/account', async route => { await release.promise; await route.continue(); });
  try {
    await page.goto('/');
    await expect(page.getByRole('status').filter({ hasText: 'Loading your practice settings' })).toBeVisible();
    await expect(page.locator('.typing-window')).toHaveCount(0);
    await expect(page.locator('.route-shell > header')).toBeVisible();
    release.resolve();
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(50);
  } finally { release.resolve(); }
});

test('offline account edits survive reload, retry safely, and sign-out restores guest settings', async ({ page }) => {
  await page.goto('/'); await chooseWords(page, 50);
  await signIn(page, 'cache-offline@test.local');
  await page.route('**/api/account/preferences', route => route.fulfill({ status: 503, json: { error: 'Modeled outage' } }));
  await page.goto('/'); await chooseWords(page, 100);
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Modeled outage' })).toBeVisible();
  await page.unroute('**/api/account/preferences');
  await page.goto('/');
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
  await synced(page);
  await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/');
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(50);
  await signIn(page, 'cache-other-owner@test.local');
  await page.goto('/');
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(50);
});

test('corrupt and denied browser storage fall back to usable practice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('clumsy-keys:guest-preferences:v1', '{bad json');
    localStorage.setItem('clumsy-keys:account-preferences:v1', '{bad json');
    localStorage.setItem('clumsy-keys:code-ui:v1', '{bad json');
  });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage denied'); };
    Storage.prototype.setItem = () => { throw new Error('Storage denied'); };
  });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
  await chooseWords(page, 50);
  expect(errors).toEqual([]);
});

test('remote updates wait until an active cached test is reset', async ({ page }) => {
  await signIn(page, 'cache-active@test.local');
  await page.goto('/'); await chooseWords(page, 100); await synced(page);
  const release = Promise.withResolvers<void>();
  await page.route('**/api/account', async route => {
    const response = await route.fetch();
    const body = await response.json();
    await release.promise;
    await route.fulfill({ response, json: { ...body, revision: body.revision + 1,
      preferences: { ...body.preferences, prose: { ...body.preferences.prose, words: 50 } } } });
  });
  try {
    await page.goto('/');
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
    await page.getByRole('textbox', { name: 'Type the practice passage' }).press('x');
    const response = page.waitForResponse('**/api/account');
    release.resolve(); await (await response).finished();
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
    await page.getByRole('button', { name: 'reset', exact: true }).click();
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(50);
  } finally { release.resolve(); }
});

test('dirty cached edits conflict with a newer server revision until explicit reload', async ({ page }) => {
  await signIn(page, 'cache-conflict@test.local');
  await page.route('**/api/account/preferences', route => route.fulfill({ status: 503, json: { error: 'Modeled outage' } }));
  await page.goto('/'); await chooseWords(page, 100);
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Modeled outage' })).toBeVisible();
  await page.unroute('**/api/account/preferences');
  let saves = 0;
  page.on('request', request => { if (request.url().endsWith('/api/account/preferences')) saves++; });
  await page.route('**/api/account', async route => {
    const response = await route.fetch(); const body = await response.json();
    await route.fulfill({ response, json: { ...body, revision: body.revision + 1 } });
  });
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Preferences changed on another device' })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
  expect(saves).toBe(0);
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Retry preference sync' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'time', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(saves).toBe(0);
});

test('cached account settings stay usable after a failed refresh and retry on reconnection', async ({ page }) => {
  await signIn(page, 'cache-reconnect@test.local');
  await page.goto('/'); await chooseWords(page, 100); await synced(page);
  await page.route('**/api/account', route => route.fulfill({ status: 503, json: { error: 'Modeled read outage' } }));
  await page.goto('/');
  await expect(page.locator('.typing-window .typing-word')).toHaveCount(100);
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Modeled read outage' })).toBeVisible();
  await page.unroute('**/api/account');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
});

test('configuration edits made during background refresh are retained and saved', async ({ page }) => {
  await signIn(page, 'cache-pending-edit@test.local');
  await page.goto('/'); await chooseWords(page, 100); await synced(page);
  const release = Promise.withResolvers<void>();
  await page.route('**/api/account', async route => {
    const response = await route.fetch();
    await release.promise;
    await route.fulfill({ response });
  });
  try {
    await page.goto('/');
    await chooseWords(page, 50);
    release.resolve();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('clumsy-keys:account-preferences:v1')!).synced?.prose.words)).toBe(50);
    await expect(page.locator('.typing-window .typing-word')).toHaveCount(50);
  } finally { release.resolve(); }
});

test('an uncached account can still practice when its initial preference request fails', async ({ page }) => {
  await signIn(page, 'cache-first-failure@test.local');
  await page.evaluate(() => localStorage.removeItem('clumsy-keys:account-preferences:v1'));
  await page.route('**/api/account', route => route.fulfill({ status: 503, json: { error: 'Modeled initial read outage' } }));
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Loading your practice settings' })).toHaveCount(0);
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Modeled initial read outage' })).toBeVisible();
});

test('first-time guests start with English 30 seconds and medium Python snippets with Auto Tabs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'time', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '30', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'english', exact: true })).toBeVisible();
  await page.goto('/#/game');
  await expect(page.getByRole('button', { name: 'Snippets', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Snippet length', exact: true }).getByRole('button', { name: 'Medium', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Auto Tabs', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Snippet language', exact: true })).toContainText('Python');
});
