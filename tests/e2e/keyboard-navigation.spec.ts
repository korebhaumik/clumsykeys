import { test, expect, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Walk the real sequential order, rather than programmatically focusing every
// control (which would miss Safari skipping otherwise focusable buttons/links).
async function walkTabOrder(page: Page, root: Locator = page.locator('body')) {
  // Join notices are transient tab stops; let them dismiss before snapshotting
  // the stable page order so locators cannot shift halfway through the walk.
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15000 });
  const candidates = root.locator('a[href], button, input, select, textarea, [tabindex]');
  const stops: Locator[] = [];
  for (const control of await candidates.all()) {
    if (await control.evaluate((element: HTMLElement) => element.tabIndex >= 0 &&
      !element.matches(':disabled') && !element.closest('[inert]')) && await control.isVisible()) stops.push(control);
  }
  expect(stops.length).toBeGreaterThan(0);
  await stops[0].focus();
  for (const stop of stops.slice(1)) {
    await page.keyboard.press('Tab');
    await expect(stop).toBeFocused();
    const field = stop.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " focus-field ")][1]');
    const fieldInput = await stop.evaluate(element => element.matches('input') && !!element.closest('.focus-field'));
    await expect(fieldInput ? field : stop).toHaveCSS('outline-style', 'solid');
  }
  for (const stop of stops.slice(0, -1).reverse()) {
    await page.keyboard.press('Shift+Tab');
    await expect(stop).toBeFocused();
  }
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test.describe(`${theme} at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    });

    test('public pages, navigation and settings support forward and backward Tab', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      for (const route of ['about', 'themes', 'login', 'leaderboard', 'account', 'history', 'ranking', 'security', 'terms', 'privacy']) {
        await page.goto('/#/' + route);
        await expect(page.locator('main')).toBeVisible();
        if (route === 'leaderboard') await expect(page.locator('.table-scroll')).toHaveAttribute('aria-busy', 'false');
        if (route === 'account') await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
        await walkTabOrder(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      if (width === 320) {
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await walkTabOrder(page);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
      }
      for (const route of ['/', '/game']) {
        await page.goto('/#' + route);
        await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await walkTabOrder(page, dialog);
        await dialog.getByRole('button', { name: 'Language', exact: true }).click();
        await walkTabOrder(page, dialog);
        await page.keyboard.press('Control+k');
        await expect(dialog).not.toBeVisible();
      }
      expect(errors).toEqual([]);
    });

    test('account, saved history and room controls support forward and backward Tab', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#/account');
      await page.getByLabel('Email', { exact: true }).fill(`keyboard-${randomUUID()}@test.local`);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
      await walkTabOrder(page);
      await page.getByRole('button', { name: /^Edit display name:/ }).press('Enter');
      await walkTabOrder(page);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();

      const token = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!;
        return JSON.parse(localStorage.getItem(key)!).access_token as string;
      });
      const response = await page.request.post('http://127.0.0.1:15442/api/practice-results', {
        headers: { Authorization: `Bearer ${token}` }, data: {
          id: randomUUID(), mode: 'prose', language: 'english',
          settings: { language: 'english', timer: 120, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
          stats: { correct: 40, incorrect: 1, extra: 0, elapsedSeconds: 120, samples: [], history: [] },
        },
      });
      expect(response.status()).toBe(201);
      await page.goto('/#/history');
      await expect(page.locator('.history-row')).toHaveCount(1);
      await walkTabOrder(page);
      await page.locator('.history-row').press('Enter');
      await expect(page.getByRole('region', { name: 'Practice results' })).toBeVisible();
      await walkTabOrder(page);

      await page.goto('/#/login');
      await page.getByLabel('Username', { exact: true }).fill('Keyboard tester');
      await page.getByLabel('Room ID', { exact: true }).fill(`keyboard-${randomUUID()}`);
      await page.getByRole('button', { name: 'Join room', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Test type', exact: true })).toBeEnabled();
      await walkTabOrder(page);
      await page.keyboard.press('Alt+r');
      await walkTabOrder(page, page.getByRole('dialog'));
      await page.keyboard.press('Escape');
      expect(errors).toEqual([]);
    });
  });
}
