import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`history table utilities in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`history-design-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
    const token = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!;
      return JSON.parse(localStorage.getItem(key)!).access_token as string;
    });
    for (let index = 0; index < 22; index++) {
      const mode = index % 2 ? 'code-snippets' : 'prose';
      const response = await page.request.post('http://127.0.0.1:15442/api/practice-results', {
        headers: { Authorization: `Bearer ${token}` }, data: {
          id: randomUUID(), mode, language: mode === 'prose' ? 'english' : 'randomPy',
          settings: mode === 'prose' ? { language: 'english', timer: 15, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } }
            : { mode: 'snippets', language: 'randomPy', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false }, autoTabs: true },
          stats: { correct: 90 + index, incorrect: 1, extra: 0, elapsedSeconds: 15, samples: [], history: [] },
        },
      });
      expect(response.status()).toBe(201);
    }
    await page.goto('/#/history');
    await expect(page.locator('tbody tr')).toHaveCount(20);
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toHaveClass(/sr-only/);
    await expect(page.locator('.history-heading')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'New test', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /refresh/i })).toHaveCount(0);
    const navigation = await page.locator('.history-navigation').boundingBox();
    const section = await page.locator('.history-page').boundingBox();
    expect(navigation!.y).toBeCloseTo(section!.y, 0);
    const table = page.getByRole('region', { name: 'Saved results, scroll for more columns' });
    await expect(page.getByRole('columnheader', { name: 'raw', exact: true })).toBeVisible();
    const wpm = page.getByRole('columnheader', { name: 'wpm', exact: true });
    await wpm.getByRole('button').click();
    await expect(wpm).toHaveAttribute('aria-sort', 'descending');
    const speeds = await page.locator('tbody .wpm').allTextContents();
    expect(speeds.map(Number)).toEqual(speeds.map(Number).sort((a, b) => b - a));
    await wpm.getByRole('button').focus(); await page.keyboard.press('Enter');
    await expect(wpm).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('button', { name: 'Load more results' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(22);
    await expect(page.getByRole('button', { name: 'Load more results' })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'History mode' }).click();
    await page.getByRole('option', { name: 'Code snippets', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(11);
    await expect(page.locator('tbody tr').first()).toContainText('Code snippets · 25 words');
    await page.getByRole('combobox', { name: 'History language' }).click();
    await page.getByRole('option', { name: 'english', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No matching tests.' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
    await expect(page.locator('tbody tr')).toHaveCount(22);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('clumsy-keys-practice-history.csv');
    await expect(table).toHaveAttribute('tabindex', width === 320 ? '0' : '-1');
    if (width === 320) {
      await table.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`history-${theme}-${width}.png`), fullPage: true });
    const resultButton = page.locator('.history-row').first();
    await resultButton.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Practice results', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to history' }).click();
    await expect(resultButton).toBeFocused();
    await expect(page.locator('tbody tr')).toHaveCount(22);
    await page.reload();
    await expect(page.locator('.history-row')).toHaveCount(20);
    await page.route('**/api/history?**', route => route.fulfill({ status: 503, json: { error: 'History temporarily unavailable.' } }));
    await page.getByRole('button', { name: 'Load more results' }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Showing previously loaded results.');
    await expect(page.locator('tbody tr')).toHaveCount(20);
    await page.unroute('**/api/history?**');
    await page.getByRole('button', { name: 'Retry history' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.history-row')).toHaveCount(22);
    await page.getByRole('button', { name: 'Race history', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No saved results yet.' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`history loading skeletons in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`history-skeleton-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
    let release = () => {};
    let requests = 0;
    const row = { id: randomUUID(), mode: 'prose', language: 'english', settings: { timer: 15 }, created_at: new Date().toISOString(), wpm: 90, raw: 91, accuracy: 98.9, deviation: 8, correct: 90, incorrect: 1, extra: 0, elapsed_seconds: 15 };
    await page.route('**/api/history?**', async route => {
      const url = new URL(route.request().url());
      requests++;
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: url.searchParams.get('kind') === 'race' ? { results: [], nextOffset: null } : url.searchParams.get('offset') === '20'
        ? { results: [{ ...row, id: 'older' }], nextOffset: null } : { results: [row], nextOffset: 20 } });
    });
    try {
      await page.goto('/#/history');
      const table = page.getByRole('region', { name: 'Saved results, scroll for more columns' });
      await expect(page.locator('.skeleton-row')).toHaveCount(5);
      await expect(page.locator('.summary-placeholder')).toHaveCount(3);
      await expect(table).toHaveAttribute('aria-busy', 'true');
      await expect(page.locator('.skeleton-row').first().locator('td')).toHaveCount(9);
      await expect(page.locator('.skeleton').first()).toHaveCSS('animation-name', 'none');
      await expect.poll(() => requests).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`history-skeleton-${theme}-${width}.png`), fullPage: true });
      release();
      await expect(page.locator('.history-row')).toHaveCount(1);
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await expect(table).toHaveAttribute('aria-busy', 'false');
      await page.reload();
      await expect(table).toHaveAttribute('aria-busy', 'true');
      await expect.poll(() => requests).toBe(2);
      await expect(page.locator('.skeleton-row')).toHaveCount(5);
      await expect(page.getByRole('button', { name: /refresh/i })).toHaveCount(0);
      release();
      await expect(table).toHaveAttribute('aria-busy', 'false');
      await page.getByRole('button', { name: 'Load more results' }).click();
      await expect(page.locator('.skeleton-row')).toHaveCount(3);
      await expect.poll(() => requests).toBe(3);
      await expect(page.locator('.history-row')).toHaveCount(1);
      await expect(page.locator('.summary-placeholder')).toHaveCount(0);
      release();
      await expect(page.locator('.history-row')).toHaveCount(2);
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await page.getByRole('button', { name: 'Race history' }).click();
      await expect(page.locator('.skeleton-row')).toHaveCount(5);
      await expect(page.locator('.skeleton-row').first().locator('td')).toHaveCount(6);
      await expect.poll(() => requests).toBe(4);
      release();
      await expect(page.getByRole('heading', { name: 'No saved results yet.' })).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}
