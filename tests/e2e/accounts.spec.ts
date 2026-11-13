import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
}
for (const theme of ['dark-forest', 'classic']) {
  test(`accounts save results, restore sessions and isolate history in ${theme}`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
    await signIn(page, `history-${theme}-${testInfo.workerIndex}@test.local`);
    await page.screenshot({ path: testInfo.outputPath(`account-${theme}.png`), fullPage: true });
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
    await dialog.getByRole('button', { name: 'Words', exact: true }).click();
    await page.getByLabel('Word count', { exact: true }).fill('10');
    await page.getByRole('button', { name: 'Set words', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Type the practice passage' });
    const passage = (await page.locator('.typing-window .typing-word').allTextContents()).join(' ');
    await input.focus(); await page.keyboard.type(passage, { delay: 20 });
    await expect(page.getByRole('status').filter({ hasText: 'Saved to your account.' })).toBeVisible();
    await page.getByRole('link', { name: 'View history', exact: true }).click();
    await expect(page.locator('.history-row')).toHaveCount(1);
    await page.reload(); await expect(page.locator('.history-row')).toHaveCount(1);
    await page.locator('.history-row').click();
    await expect(page.getByRole('region', { name: 'Practice results' })).toBeVisible();
    await page.goto('/#/account'); await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
    await signIn(page, `other-${theme}-${testInfo.workerIndex}@test.local`);
    await page.goto('/#/history'); await expect(page.getByText('No saved results yet.')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test('signup, invalid credentials and recovery remain keyboard accessible', async ({ page }) => {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill('invalid@test.local');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid login credentials');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Ada');
  await page.getByLabel('Email', { exact: true }).fill('confirm-ada@test.local');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await page.goto('/?code=confirmation-code&auth_action=confirm');
  await expect(page.getByRole('heading', { name: 'Your account.' })).toBeVisible();
  await expect(page).toHaveURL(/#\/account$/);
  await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('confirm-ada@test.local');
  await page.getByRole('button', { name: 'Send reset link', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('reset link');
  await page.goto('/?code=recovery-code&auth_action=recovery');
  await expect(page.getByRole('heading', { name: 'Choose a new password.' })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('new-password-123');
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Password updated.' })).toBeVisible();
});

test('account preferences hydrate on another device and restore guest appearance after sign-out', async ({ page, browser }) => {
  await signIn(page, 'preferences-devices@test.local');
  await page.goto('/#/themes');
  await page.getByRole('combobox', { name: 'Color theme' }).click();
  await page.getByRole('option', { name: 'Classic', exact: true }).click();
  await page.goto('/#/account');
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
  const other = await browser.newContext({ viewport: { width: 320, height: 740 } });
  try {
    const second = await other.newPage();
    await signIn(second, 'preferences-devices@test.local');
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'classic');
    expect(await second.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await second.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark-forest');
  } finally { await other.close(); }
});

test('failed result retries stay bound to the original account', async ({ page, request }) => {
  await signIn(page, 'retry-owner@test.local');
  await request.post('http://127.0.0.1:15443/__control', { data: { failWrites: true } });
  try {
    await page.goto('/'); await page.getByRole('button', { name: 'quotes', exact: true }).click();
    const passage = (await page.locator('.typing-window .typing-word').allTextContents()).join(' ');
    await page.getByRole('textbox', { name: 'Type the practice passage' }).focus(); await page.keyboard.type(passage, { delay: 20 });
    await expect(page.getByRole('status').filter({ hasText: 'Result not saved.' })).toBeVisible();
  } finally { await request.post('http://127.0.0.1:15443/__control', { data: { failWrites: false } }); }
  await page.goto('/#/account'); await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'retry-other@test.local'); await page.goto('/#/history');
  await expect(page.getByText('No saved results yet.')).toBeVisible();
  await page.goto('/#/account'); await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'retry-owner@test.local'); await page.goto('/#/history');
  await expect(page.locator('.history-row')).toHaveCount(1);
});

test('signed-in race results survive a leaderboard refresh and appear in account history', async ({ page, browser }) => {
  await signIn(page, 'race-history@test.local');
  const other = await browser.newContext();
  try {
    const guest = await other.newPage();
    const room = `account-race-${Date.now()}`;
    for (const [target, username] of [[page, 'Ada'], [guest, 'Guest']] as const) {
      await target.goto('/#/login'); await target.getByLabel('Username', { exact: true }).fill(username);
      await target.getByLabel('Room ID', { exact: true }).fill(room);
      await target.getByRole('button', { name: 'Join room', exact: true }).click();
      await expect(target.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Vote to start' }).click();
    await guest.getByRole('button', { name: 'Vote to start' }).click();
    await expect(page.getByRole('textbox', { name: 'Type the race passage' })).toBeEnabled({ timeout: 10000 });
    const passage = (await page.locator('.race-passage .typing-word').allTextContents()).join(' ');
    for (const target of [page, guest]) { await target.getByRole('textbox', { name: 'Type the race passage' }).focus(); await target.keyboard.type(passage, { delay: 20 }); }
    await expect(page.getByRole('heading', { name: 'Race results' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Race saved to your account.');
    await page.goto('/#/ranking'); await page.reload();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.goto('/#/history'); await page.getByRole('button', { name: 'Race history', exact: true }).click();
    await expect(page.locator('.history-row')).toHaveCount(1);
    await page.locator('.history-row').click(); await expect(page.getByRole('heading', { name: `Race · ${room}` })).toBeVisible();
  } finally { await other.close(); }
});

test('an old account save does not block preferences after switching accounts', async ({ page, request }) => {
  await signIn(page, 'slow-save-owner@test.local');
  await request.post('http://127.0.0.1:15443/__control', { data: { writeDelay: 2000 } });
  try {
    await page.goto('/#/themes');
    const saving = page.waitForRequest(req => req.url().endsWith('/api/account/preferences') && req.method() === 'PUT');
    await page.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: 'Classic', exact: true }).click(); await saving;
    await page.goto('/#/account'); await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('slow-save-next@test.local');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible({ timeout: 10000 });
  } finally { await request.post('http://127.0.0.1:15443/__control', { data: { writeDelay: 0 } }); }
});
