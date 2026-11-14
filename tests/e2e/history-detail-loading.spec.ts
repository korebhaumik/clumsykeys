import { expect, test, type Route } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`history result loading and return navigation in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`detail-loader-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
    const created_at = new Date().toISOString();
    const practice = { id: randomUUID(), mode: 'prose', language: 'english', settings: { timer: 15 }, created_at,
      wpm: 90, raw: 91, accuracy: 98.9, deviation: 8, correct: 90, incorrect: 1, extra: 0, elapsed_seconds: 15 };
    const race = { round_id: randomUUID(), participant_id: randomUUID(), created_at, wpm: 75, accuracy: 98, typed_chars: 100, reason: 'completed' };
    await page.route('**/api/history?**', route => route.fulfill({ json: { results: new URL(route.request().url()).searchParams.get('kind') === 'race' ? [race] : [practice], nextOffset: null } }));
    const pending = new Map<number, () => void>();
    let reads = 0;
    let failNext = false;
    async function detailResponse(route: Route) {
      const request = ++reads;
      const fail = failNext; failNext = false;
      await new Promise<void>(resolve => pending.set(request, resolve));
      await route.fulfill(fail ? { status: 503, json: { error: 'Result temporarily unavailable.' } } : { json: route.request().url().includes('/practice-results/')
        ? { summary: practice, samples: [], history: [] }
        : { round: { room_id: 'loading-race', settings: { mode: 'time', language: 'english', duration: 30, wordCount: 25, punctuation: true, numbers: false } }, results: [{ username: 'Ada', speed_history: [{ seconds: 1, wpm: 50 }, { seconds: 10, wpm: 75 }], finish_seconds: 10 }] } });
    }
    await page.route('**/api/practice-results/*', detailResponse);
    await page.route('**/api/race-results/*', detailResponse);
    try {
      await page.goto('/#/history');
      for (const kind of ['practice', 'race'] as const) {
        if (kind === 'race') await page.getByRole('button', { name: 'Race history', exact: true }).click();
        const opener = page.locator('.history-row');
        await expect(opener).toHaveCount(1);
        const details = page.getByRole('region', { name: 'Result details', exact: true });
        const back = page.getByRole('button', { name: 'Back to history' });
        const table = page.getByRole('region', { name: 'Saved results, scroll for more columns' });
        const firstRead = reads + 1;
        await opener.focus(); await page.keyboard.press('Enter');
        await expect.poll(() => reads).toBe(firstRead);
        await expect(details).toBeVisible();
        await expect(details).toHaveAttribute('aria-busy', 'true');
        await expect(table).toBeHidden();
        await expect(details.getByRole('status')).toHaveText('Loading result…');
        await expect(details.locator('.result-detail-skeleton')).toBeVisible();
        await expect(details.locator('.result-detail-skeleton')).toHaveCSS('animation-name', 'none');
        await expect(details.getByRole('heading', { level: 2 })).toBeFocused();
        const groupBounds = await page.getByRole('group', { name: 'History type' }).boundingBox();
        const backBounds = await back.boundingBox();
        expect(backBounds!.x).toBeGreaterThanOrEqual(groupBounds!.x + groupBounds!.width);
        expect(backBounds!.y).toBeLessThan(groupBounds!.y + groupBounds!.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${kind}-result-skeleton-${theme}-${width}.png`), fullPage: true });
        // Back is available before the server responds; the late response must not reopen details.
        await back.click();
        await expect(opener).toBeFocused();
        await expect(table).toBeVisible();
        const completed = page.waitForResponse(response => response.url().includes(kind === 'practice' ? '/api/practice-results/' : '/api/race-results/'));
        pending.get(firstRead)!(); await completed;
        await expect(details).toHaveCount(0);
        failNext = true;
        await opener.click();
        const failedRead = firstRead + 1;
        await expect.poll(() => reads).toBe(failedRead);
        pending.get(failedRead)!();
        await expect(details.getByRole('alert')).toHaveText('Result temporarily unavailable.');
        await expect(details.locator('.result-detail-skeleton')).toHaveCount(0);
        await expect(table).toBeHidden();
        await details.getByRole('button', { name: 'Retry result', exact: true }).click();
        const retryRead = firstRead + 2;
        await expect.poll(() => reads).toBe(retryRead);
        await expect(details.locator('.result-detail-skeleton')).toBeVisible();
        pending.get(retryRead)!();
        await expect(details).toHaveAttribute('aria-busy', 'false');
        await expect(details.locator('.result-detail-skeleton')).toHaveCount(0);
        if (kind === 'practice') await expect(details.getByRole('region', { name: 'Practice results', exact: true })).toBeVisible();
        else await expect(details.getByRole('heading', { name: 'Race · loading-race' })).toBeVisible();
        await back.click();
        await expect(opener).toBeFocused();
      }
      expect(errors).toEqual([]);
    } finally { for (const release of pending.values()) release(); }
  });
}
