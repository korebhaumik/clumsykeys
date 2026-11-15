import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`account display names reach rankings and editable room aliases in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    if (width === 320) {
      await page.getByRole('button', { name: 'Continue with GitHub' }).click();
      await expect(page.getByRole('heading', { name: 'GitHub typist', exact: true })).toBeVisible();
    } else {
      await page.getByLabel('Email', { exact: true }).fill(`name-${randomUUID()}@test.local`);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    }
    // The shared OAuth fixture can restore a theme saved by an earlier case.
    await page.goto('/#/themes');
    await page.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: theme === 'classic' ? 'Classic' : 'Dark Forest', exact: true }).click();
    await page.goto('/#/account');
    const edit = page.getByRole('button', { name: 'Edit display name' });
    await expect(edit).toBeVisible();
    await expect(edit).not.toHaveText('');
    await edit.hover();
    await expect(edit).toHaveCSS('background-color', theme === 'classic' ? 'rgb(229, 231, 235)' : 'rgb(52, 62, 57)');
    await expect(edit).toHaveCSS('text-decoration-line', 'underline');
    await edit.click();
    await expect(page.getByLabel('Display name', { exact: true })).toHaveCount(0);
    const row = page.locator('.name-row');
    const headingBounds = await row.getByRole('heading').boundingBox();
    const rowBounds = await row.boundingBox();
    const nameBounds = await edit.boundingBox();
    expect(Math.abs(nameBounds!.x + nameBounds!.width / 2 - rowBounds!.x - rowBounds!.width / 2)).toBeLessThan(1);
    expect(Math.abs(headingBounds!.x + headingBounds!.width / 2 - rowBounds!.x - rowBounds!.width / 2)).toBeLessThan(1);
    await page.screenshot({ path: testInfo.outputPath('editable-name.png'), fullPage: true });
    const token = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!)!).access_token);
    const saved = await page.request.post('http://127.0.0.1:15442/api/practice-results', { headers: { Authorization: `Bearer ${token}` }, data: {
      id: randomUUID(), mode: 'prose', language: 'english', settings: { language: 'english', timer: 30, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
      stats: { correct: 200, incorrect: 0, extra: 0, elapsedSeconds: 30, samples: [], history: [] },
    }});
    expect(saved.status()).toBe(201);
    if (width === 320) {
      await page.goto('/#/leaderboard');
      await expect(page.locator('tbody tr[aria-current="true"]')).toContainText('GitHub typist');
      await page.goto('/#/account');
    }
    await page.getByRole('button', { name: 'Edit display name' }).dblclick();
    await expect(page.getByLabel('Display name', { exact: true })).toBeFocused();
    const editingHeading = await row.getByRole('heading').boundingBox();
    expect(Math.abs(editingHeading!.x + editingHeading!.width / 2 - rowBounds!.x - rowBounds!.width / 2)).toBeLessThan(1);
    await page.screenshot({ path: testInfo.outputPath('name-editor.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Display name', { exact: true }).fill('   ');
    await page.getByRole('button', { name: 'Save display name' }).click();
    await expect(page.getByRole('alert')).toContainText('1–50');
    await page.getByLabel('Display name', { exact: true }).fill('private@example.com');
    await page.getByRole('button', { name: 'Save display name' }).click();
    await expect(page.getByRole('alert')).toContainText('without an @');
    const newName = `Typist ${theme} ${width}`;
    await page.getByLabel('Display name', { exact: true }).fill(`  ${newName}  `);
    await page.route('**/auth/v1/user', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { msg: 'Unavailable' } }) : route.continue());
    await page.getByRole('button', { name: 'Save display name' }).click();
    await expect(page.getByRole('alert')).toContainText('Please retry');
    await expect(page.getByLabel('Display name', { exact: true })).toHaveValue(`  ${newName}  `);
    await page.unroute('**/auth/v1/user');
    await page.getByRole('button', { name: 'Save display name' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible();
    await page.goto('/#/leaderboard');
    await expect(page.locator('tbody tr[aria-current="true"]')).toContainText(newName);
    await page.goto('/#/login');
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue(newName);
    await page.getByLabel('Username', { exact: true }).fill('Room alias');
    await page.getByLabel('Room ID', { exact: true }).fill(`alias-${randomUUID()}`);
    await page.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Racers in the room' })).toContainText('Room alias');
    await page.goto('/#/account');
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit display name' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Display name', { exact: true })).toBeFocused();
    await page.getByLabel('Display name', { exact: true }).fill('Discarded');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit display name' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByLabel('Display name', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    if (width === 320) {
      await page.getByRole('button', { name: 'Edit display name' }).dblclick();
      await page.getByLabel('Display name', { exact: true }).fill('GitHub typist');
      await page.getByRole('button', { name: 'Save display name' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Display name saved.' })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
