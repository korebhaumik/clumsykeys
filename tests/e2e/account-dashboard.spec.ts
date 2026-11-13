import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`private profile dashboard in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`dashboard-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    const profile = page.getByRole('region', { name: 'Your account.', exact: true });
    await expect(profile.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();
    await expect(profile.locator('dl > div').filter({ hasText: 'characters typed' }).locator('dd')).toHaveText('0');
    await expect(profile.locator('dl > div').filter({ hasText: 'average duration' }).locator('dd')).toHaveText('—');
    await expect(profile.getByText('No saved results yet.', { exact: false })).toBeVisible();
    await expect(profile.getByText('Joined', { exact: false })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`empty-profile-${theme}-${width}.png`), fullPage: true });

    const token = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!;
      return JSON.parse(localStorage.getItem(key)!).access_token as string;
    });
    for (const [mode, correct, seconds] of [['prose', 40, 10], ['prose', 60, 10], ['code-keywords', 80, 20]] as const) {
      const result = await page.request.post('http://127.0.0.1:15442/api/practice-results', {
        headers: { Authorization: `Bearer ${token}` }, data: {
          id: randomUUID(), mode, language: mode === 'prose' ? 'english' : 'randomJs',
          settings: mode === 'prose' ? { language: 'english', timer: 30, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } }
            : { mode: 'keywords', language: 'randomJs', limit: { type: 'words', value: 25 }, modifiers: { numbers: false, punctuation: false }, autoTabs: true },
          stats: { correct, incorrect: 0, extra: 0, elapsedSeconds: seconds, samples: [], history: [] },
        },
      });
      expect(result.status()).toBe(201);
    }
    await page.getByRole('button', { name: 'Refresh stats', exact: true }).click();
    await expect(profile.locator('dl > div').filter({ hasText: 'tests completed' }).locator('dd')).toHaveText('3');
    await expect(profile.locator('dl > div').filter({ hasText: 'average wpm' }).first().locator('dd')).toHaveText('70');
    await expect(profile.locator('dl > div').filter({ hasText: 'time typing' }).locator('dd')).toHaveText('00:00:40');
    await expect(profile.locator('dl > div')).toHaveCount(8);
    await expect(profile.locator('dl > div').filter({ hasText: 'characters typed' }).locator('dd')).toHaveText('180');
    await expect(profile.locator('dl > div').filter({ hasText: 'average duration' }).locator('dd')).toHaveText('13.3s');
    await expect(profile.locator('tbody tr')).toHaveCount(3);
    await expect(profile.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Prose', exact: true }) })).toContainText('90 wpm');
    await expect(profile.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Code keywords', exact: true }) })).toContainText('JavaScript');
    const content = await profile.boundingBox(), container = await page.locator('.page-shell').boundingBox();
    expect(content!.width).toBeCloseTo(container!.width, 0);
    const statsSection = await profile.getByRole('region', { name: 'Stats', exact: true }).boundingBox();
    const statsGrid = await profile.locator('.stats-grid').boundingBox();
    for (const bounds of [statsSection, statsGrid]) {
      expect(bounds!.x).toBeCloseTo(content!.x, 0);
      expect(bounds!.width).toBeCloseTo(content!.width, 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 320) {
      const scroll = page.getByRole('region', { name: 'Recent test results, scroll for more columns' });
      await scroll.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`profile-${theme}-${width}.png`), fullPage: true });
    await page.route('**/api/account/dashboard', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Statistics temporarily unavailable.' }) }));
    await page.getByRole('button', { name: 'Refresh stats', exact: true }).click();
    await expect(profile.getByRole('alert')).toContainText('Showing the previous snapshot.');
    await page.unroute('**/api/account/dashboard');
    await page.getByRole('button', { name: 'Refresh stats', exact: true }).click();
    await expect(profile.getByRole('alert')).toHaveCount(0);
    await profile.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`account skeletons in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    let release = () => {};
    let requests = 0;
    await page.route('**/api/account/dashboard', async route => {
      requests++;
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: { stats: { tests: 0, seconds: 0, characters: 0, averageWpm: 0, averageRaw: 0, averageAccuracy: 0, bestWpm: 0 }, bests: [], recent: [] } });
    });
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`skeleton-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    const profile = page.getByRole('region', { name: 'Your account.', exact: true });
    await expect(profile.locator('.stat-placeholder')).toHaveCount(8);
    await expect(profile.locator('.best-placeholders')).toHaveCount(3);
    await expect(profile.locator('.skeleton-row')).toHaveCount(5);
    await expect(profile.getByRole('region', { name: 'Stats', exact: true })).toHaveAttribute('aria-busy', 'true');
    await expect(profile.locator('.skeleton').first()).toHaveCSS('animation-name', 'none');
    await expect(profile.getByRole('button', { name: 'Refreshing…', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`account-skeleton-${theme}-${width}.png`), fullPage: true });
    release();
    await expect(profile.locator('.skeleton')).toHaveCount(0);
    await expect(profile.getByText('No saved results yet.', { exact: false })).toBeVisible();
    await expect(profile.getByRole('region', { name: 'Stats', exact: true })).toHaveAttribute('aria-busy', 'false');
    await profile.getByRole('button', { name: 'Refresh stats', exact: true }).click();
    await expect.poll(() => requests).toBe(2);
    // Keep the previous snapshot visible during a refresh.
    await expect(profile.locator('.skeleton')).toHaveCount(0);
    await expect(profile.getByText('No saved results yet.', { exact: false })).toBeVisible();
    release();
    await expect(profile.getByRole('button', { name: 'Refresh stats', exact: true })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
