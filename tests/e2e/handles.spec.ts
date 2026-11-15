import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function signIn(page: Page) {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill(`handle-${randomUUID()}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose a unique handle' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit display name' }).dblclick();
  await page.getByLabel('Display name', { exact: true }).fill('Alex');
  await page.getByRole('button', { name: 'Save display name' }).click();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`unique handles distinguish duplicate names in ${theme} at ${width}px`, async ({ page, browser }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await signIn(page);
    const handle = `alex_${randomUUID().slice(0, 8)}`;
    await page.getByRole('button', { name: 'Choose a unique handle' }).click();
    const input = page.getByLabel('Unique handle', { exact: true });
    await expect(input).toBeFocused();
    await input.fill('alex.key');
    await page.getByRole('button', { name: 'Save handle', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('3–24');
    await input.fill(handle.toUpperCase());
    await page.route('**/api/account/handle', route => route.fulfill({ status: 503, json: { error: 'Handle service unavailable. Please retry.' } }));
    await page.getByRole('button', { name: 'Save handle', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Please retry');
    await expect(input).toHaveValue(handle.toUpperCase());
    await page.unroute('**/api/account/handle');
    await page.getByRole('button', { name: 'Save handle', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`@${handle}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`@${handle}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('account-handle.png'), fullPage: true });

    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      const other = await context.newPage();
      await signIn(other);
      await other.getByRole('button', { name: 'Choose a unique handle' }).click();
      await other.getByLabel('Unique handle', { exact: true }).fill(handle.toUpperCase());
      await other.getByRole('button', { name: 'Save handle', exact: true }).click();
      await expect(other.getByRole('alert')).toContainText('Handle already taken');
      await other.getByLabel('Unique handle', { exact: true }).fill(`${handle}_2`);
      await other.getByRole('button', { name: 'Save handle', exact: true }).click();
      await expect(other.getByText(`@${handle}_2`, { exact: true })).toBeVisible();
      for (const target of [page, other]) {
        const token = await target.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!)!).access_token);
        const saved = await target.request.post('http://127.0.0.1:15442/api/practice-results', { headers: { Authorization: `Bearer ${token}` }, data: {
          id: randomUUID(), mode: 'prose', language: 'english', settings: { language: 'english', timer: 120, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
          stats: { correct: 2400, incorrect: 0, extra: 0, elapsedSeconds: 120, samples: [], history: [] },
        }});
        expect(saved.status()).toBe(201);
      }
      await page.goto('/#/leaderboard?length=120');
      for (const value of [handle, `${handle}_2`]) {
        const player = page.getByRole('rowheader').filter({ has: page.getByText(`@${value}`, { exact: true }) });
        await expect(player.locator('.handle')).toHaveText(`@${value}`);
        await expect(player).not.toContainText('Alex');
        if (value === handle) {
          const label = await player.locator('.handle').boundingBox();
          const badge = await player.locator('.you').boundingBox();
          expect(Math.abs(label!.y + label!.height / 2 - badge!.y - badge!.height / 2)).toBeLessThan(3);
        }
      }
      await page.screenshot({ path: testInfo.outputPath('leaderboard-handles.png'), fullPage: true });
    } finally { await context.close(); }
    await page.goto('/#/account');
    await expect(page.getByRole('button', { name: 'Change handle', exact: true })).toHaveCount(0);
    const editableHandle = page.getByRole('button', { name: /^Edit handle:/ });
    await expect(editableHandle).toHaveCSS('color', theme === 'classic' ? 'rgb(0, 0, 0)' : 'rgb(155, 205, 134)');
    await editableHandle.hover();
    await expect(editableHandle).toHaveCSS('text-decoration-line', 'underline');
    await editableHandle.click();
    await expect(page.getByLabel('Unique handle', { exact: true })).toHaveCount(0);
    await editableHandle.dblclick();
    await page.getByLabel('Unique handle', { exact: true }).fill(`${handle}_new`);
    await page.getByRole('button', { name: 'Cancel handle edit' }).click();
    await expect(page.getByText(`@${handle}`, { exact: true })).toBeVisible();
    await page.goto('/#/login');
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue('Alex');
    await page.getByLabel('Username', { exact: true }).fill('Race alias');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
