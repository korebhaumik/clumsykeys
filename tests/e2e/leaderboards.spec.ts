import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith('solo rankings') || info.title.startsWith('invalid URL')) {
    await page.route('**/src/lib/features/leaderboards/leaderboard-service.ts*', route => route.fulfill({ contentType: 'text/javascript', body: 'export { leaderboardService, previewUserId } from "/tests/fixtures/leaderboard-service.ts";' }));
  }
});

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
const rankingRows = (page: Page) => page.locator('tbody tr:not(.skeleton-row)');
async function expectCompactTable(page: Page) {
  const unusedHeight = await page.locator('.table-scroll').evaluate(element => {
    const table = element.querySelector('table')!.getBoundingClientRect();
    return element.getBoundingClientRect().bottom - table.bottom;
  });
  // Allow the horizontal scrollbar at narrow widths, but no reserved empty rows.
  expect(unusedHeight).toBeLessThan(24);
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 768, 1440]) {
  test(`solo rankings in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/leaderboard');
    await expect(page.getByRole('tablist', { name: 'Solo typing mode' })).toBeVisible();
    await expect(page.getByText('34 players · best result per player', { exact: true })).toBeVisible();
    await expect(rankingRows(page)).toHaveCount(10);
    await expect(page.getByRole('columnheader')).toHaveText(['rank', 'player', 'wpm', 'wpm (raw)', 'accuracy', 'wpm std', 'chars¹', 'language', 'date']);
    await expect(page.getByLabel('Preview player standing')).toContainText('#18');
    await page.getByRole('button', { name: 'View your page', exact: true }).click();
    await expect(page.locator('tbody tr[aria-current="true"]')).toContainText('preview player');
    await expect(page).toHaveURL(/page=2/);
    await page.reload();
    await expect(page.locator('tbody tr[aria-current="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'Next leaderboard page', exact: true }).click();
    await expect(rankingRows(page)).toHaveCount(10);
    await page.getByRole('button', { name: 'Next leaderboard page', exact: true }).click();
    await expect(rankingRows(page)).toHaveCount(4);
    await expectCompactTable(page);
    await expect(page.getByRole('button', { name: 'Next leaderboard page', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Preview player standing')).toContainText('#18');
    await choose(page, 'Time range', 'Past 24 hours');
    await expect(page).toHaveURL(/range=day&page=1/);
    await expect(rankingRows(page)).toHaveCount(2);
    await expectCompactTable(page);
    await page.locator('.table-scroll').screenshot({ path: testInfo.outputPath(`compact-rankings-${theme}-${width}.png`) });
    await expect(page.getByLabel('Preview player standing')).toContainText('No ranked result');
    const prose = page.getByRole('tab', { name: 'Prose', exact: false });
    await prose.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Dev', exact: false })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Dev', exact: false })).toBeFocused();
    await expect(page.getByRole('combobox', { name: 'Leaderboard language' })).toHaveText('Python');
    await choose(page, 'Leaderboard language', 'JavaScript');
    await choose(page, 'Leaderboard test', 'Keywords · timed');
    await choose(page, 'Test length', '60 seconds');
    await choose(page, 'Time range', 'All time');
    await expect(page).toHaveURL(/mode=dev&language=randomJs&test=keywords-time&length=60&range=all&page=1/);
    await expect(rankingRows(page)).toHaveCount(10);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Test length' })).toHaveText('60 seconds');
    await page.goBack();
    await expect(page.getByRole('combobox', { name: 'Time range', exact: true })).toHaveText('Past 24 hours');
    await page.goForward();
    await expect(page.getByRole('combobox', { name: 'Time range', exact: true })).toHaveText('All time');
    await expect(page.getByText('34 players · best result per player', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) {
      const scroll = page.getByRole('region', { name: 'Solo rankings, scroll for more columns' });
      await scroll.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`leaderboards-${theme}-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('loading, stale request cancellation, compact empty results and retry are stable', async ({ page }) => {
  await page.route('**/src/lib/features/leaderboards/leaderboard-service.ts*', route => route.fulfill({ contentType: 'text/javascript', body: `
    export const previewUserId = 'preview';
    let requests = 0;
    export const leaderboardService = { isDemo: true, async read(filters, userId, signal) {
      const current = ++requests;
      await new Promise(resolve => setTimeout(resolve, current === 1 ? 1200 : 100));
      if (current === 1) return { rows: [], currentUser: null, total: 99, page: 1, pages: 10 };
      if (current === 2) throw new Error('Temporarily unavailable. Please retry.');
      return { rows: [], currentUser: null, total: 0, page: 1, pages: 1 };
    }};` }));
  await page.goto('/#/leaderboard?mode=prose&language=english&test=time&length=30&range=all&page=1');
  await expect(page.locator('.skeleton-row')).toHaveCount(10);
  const initialHeight = await page.locator('.table-scroll').evaluate(element => element.getBoundingClientRect().height);
  await page.getByRole('tab', { name: 'Dev', exact: false }).click();
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
  await page.getByRole('button', { name: 'Retry rankings' }).click();
  await expect(page.getByRole('heading', { name: 'A fresh leaderboard.' })).toBeVisible();
  await expect(page.getByText('0 players · best result per player')).toBeVisible();
  // The superseded slow Prose response must not replace the active Dev result.
  await page.waitForTimeout(1300);
  await expect(page.getByText('0 players · best result per player')).toBeVisible();
  expect(await page.locator('.table-scroll').evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(initialHeight / 2);
  await expect(page.locator('.character-note')).toHaveCount(0);
});

test('invalid URL is canonicalized and off-page ranks remain accessible', async ({ page }) => {
  await page.goto('/#/leaderboard?mode=dev&language=hinglish&test=time&length=3&page=999');
  await expect(page).toHaveURL(/mode=dev&language=randomPy&test=snippets&length=0&range=all&page=4/);
  await expect(rankingRows(page)).toHaveCount(4);
  await page.getByRole('tab', { name: 'Prose', exact: false }).click();
  await choose(page, 'Leaderboard test', 'Quotes (English)');
  await expect(page.getByRole('combobox', { name: 'Leaderboard language' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Test length' })).toBeDisabled();
  await expect(page).toHaveURL(/test=quotes&length=0/);
});

test('signed-in solo scores load from the real backend adapter', async ({ page }) => {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill('solo-leaderboard@test.local');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!;
    return JSON.parse(localStorage.getItem(key)!).access_token;
  });
  const saved = await page.request.post('http://127.0.0.1:15442/api/practice-results', { headers: { Authorization: `Bearer ${token}` }, data: {
    id: randomUUID(), mode: 'prose', language: 'english', settings: { language: 'english', timer: 30, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
    stats: { correct: 200, incorrect: 0, extra: 0, elapsedSeconds: 30, samples: [], history: [] },
  }});
  expect(saved.status()).toBe(201);
  await page.goto('/#/leaderboard');
  await expect(page.getByLabel('Your standing' , { exact: true })).toContainText('100 WPM');
  await expect(page.locator('tbody tr[aria-current="true"]')).toHaveCount(1);
  await expectCompactTable(page);
  await expect(page.getByText('Demo scores', { exact: true })).toHaveCount(0);
});

for (const theme of ['dark-forest', 'classic']) {
  test(`Appearance sample uses two equal-sized lines in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/themes');
    const geometry = await page.locator('.theme-sample').evaluate(element => {
      const first = element.querySelector('.typing-word')!, second = element.querySelector('.sample-next-line')!;
      return { firstSize: getComputedStyle(first).fontSize, secondSize: getComputedStyle(second).fontSize,
        firstSpacing: getComputedStyle(first).letterSpacing, secondSpacing: getComputedStyle(second).letterSpacing,
        firstTop: first.getBoundingClientRect().top, secondTop: second.getBoundingClientRect().top };
    });
    expect(geometry.firstSize).toBe(geometry.secondSize); expect(geometry.firstSpacing).toBe(geometry.secondSpacing);
    expect(geometry.secondTop).toBeGreaterThan(geometry.firstTop);
    await page.screenshot({ path: testInfo.outputPath(`appearance-two-lines-${theme}.png`), fullPage: true });
  });
}
