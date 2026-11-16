import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { practiceCategoryKey } from '../../backend/src/practice-category.contract';

const shortQuotes = { mode: 'prose', language: 'english', test: 'quotes', length: 'short' } as const;
const guestSeed = { version: 2, bests: {
  [practiceCategoryKey(shortQuotes)]: 1,
  [practiceCategoryKey({ mode: 'code-snippets', language: 'randomPy', test: 'snippets', length: 'medium' })]: 1,
  [practiceCategoryKey({ mode: 'code-keywords', language: 'randomPy', test: 'words', length: 25 })]: 1,
} };

async function pauseToastExit(popup: Locator) {
  await popup.evaluate(element => element.addEventListener('outrostart', () => {
    queueMicrotask(() => element.getAnimations().forEach(animation => animation.pause()));
  }, { once: true }));
}

async function verifyToastExit(page: Page) {
  // Svelte makes an outgoing element inert, excluding it from role queries.
  const popup = page.locator('.personal-best');
  await expect(popup).toHaveJSProperty('inert', true);
  await expect.poll(() => popup.evaluate(element => element.getAnimations().some(animation => animation.playState === 'paused'))).toBe(true);
  const frame = await popup.evaluate(element => {
    const animation = element.getAnimations().find(animation => animation.playState === 'paused')!;
    const duration = Number(animation.effect!.getTiming().duration);
    animation.currentTime = duration / 2;
    const middleTop = element.getBoundingClientRect().top;
    const middleOpacity = Number(getComputedStyle(element).opacity);
    animation.currentTime = duration;
    const finalBottom = element.getBoundingClientRect().bottom;
    animation.finish();
    return { duration, middleTop, middleOpacity, finalBottom };
  });
  expect(frame.duration).toBeGreaterThan(0);
  expect(frame.middleTop).toBeLessThan(16);
  expect(frame.middleOpacity).toBeGreaterThan(0);
  expect(frame.middleOpacity).toBeLessThan(1);
  expect(frame.finalBottom).toBeLessThanOrEqual(1);
  await expect(popup).toHaveCount(0);
}

async function finishPractice(page: Page, mode: 'prose' | 'snippets' | 'keywords', delay = 20) {
  if (mode === 'snippets') {
    const input = page.getByRole('textbox', { name: 'Type the practice snippet' });
    await input.focus();
    const lines = await page.locator('.code-line-text').evaluateAll(lines => lines.map(line =>
      Array.from(line.children, word => word.textContent ?? '').join(' ')));
    for (const [index, line] of lines.entries()) {
      if (index) await page.keyboard.press('Enter');
      await page.keyboard.type(line, { delay });
    }
  } else {
    const input = page.getByRole('textbox', { name: mode === 'prose' ? 'Type the practice passage' : 'Type the practice keywords' });
    await input.focus();
    const words = await page.locator(mode === 'prose' ? '.typing-word' : '.code-line-text > span').allTextContents();
    await page.keyboard.type(words.join(' '), { delay });
  }
  await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
}

async function shortProse(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
  await dialog.getByRole('button', { name: 'Quotes', exact: true }).click();
  await dialog.getByRole('button', { name: 'Short', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`PB popup and mini keyboard in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    await page.addInitScript(({ theme, bests }) => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('clumsy-keys:guest-personal-bests', JSON.stringify(bests));
      Math.random = () => 0;
    }, { theme, bests: guestSeed });

    await page.goto('/#/account');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    const keys = page.getByRole('group', { name: 'Mini keyboard' }).getByRole('button');
    if (width === 1440) {
      await expect(keys).toHaveCount(8);
      const email = page.getByLabel('Email', { exact: true });
      const password = page.getByLabel('Password', { exact: true });
      await email.fill('unchanged@test.local'); await password.fill('unchanged');
      const requests: string[] = [];
      page.on('request', request => { if (request.method() !== 'GET') requests.push(request.url()); });
      await keys.first().hover();
      await expect(keys.first()).toHaveCSS('background-color', theme === 'classic' ? 'rgb(229, 231, 235)' : 'rgb(52, 62, 57)');
      await page.mouse.down();
      await expect(keys.first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 2)');
      await page.mouse.up();
      await page.screenshot({ path: testInfo.outputPath('mini-keyboard.png') });
      await keys.first().focus();
      for (const key of (await keys.all()).slice(1)) {
        await page.keyboard.press('Tab'); await expect(key).toBeFocused();
      }
      for (const key of (await keys.all()).slice(0, -1).reverse()) {
        await page.keyboard.press('Shift+Tab'); await expect(key).toBeFocused();
      }
      await expect(keys.first()).toHaveCSS('outline-style', 'solid');
      await page.keyboard.down('Space');
      await expect(keys.first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 2)');
      await page.keyboard.up('Space'); await page.keyboard.press('Enter');
      await expect(email).toHaveValue('unchanged@test.local'); await expect(password).toHaveValue('unchanged');
      await expect(page).toHaveURL(/#\/account$/); expect(requests).toEqual([]);
    } else {
      await expect(page.getByRole('group', { name: 'Mini keyboard' })).toBeHidden();
    }

    for (const mode of ['prose', 'snippets', 'keywords'] as const) {
      if (mode === 'prose') await shortProse(page);
      else {
        await page.goto('/#/game');
        if (mode === 'keywords') await page.getByRole('button', { name: 'Keywords', exact: true }).click();
      }
      await finishPractice(page, mode);
      const popup = page.getByRole('complementary', { name: 'New personal best' });
      await expect(popup).toBeVisible(); await expect(popup).toContainText('Previous best: 1 WPM');
      await expect(popup).toContainText('Achievement unlocked');
      await expect(popup).toContainText('This device');
      await expect(popup).toContainText(mode === 'prose' ? 'English · Short quotes' : mode === 'snippets' ? 'Python · Medium snippets' : 'Python · 25 keywords');
      await expect(popup).toHaveCSS('animation-name', width === 320 ? 'none' : /celebrate$/);
      await expect(popup).toHaveCSS('transform', 'none');
      await expect(popup.locator('.medal-ring')).toHaveCSS('animation-name', width === 320 ? 'none' : /medal-pop$/);
      await expect(popup.locator('.medal-ring')).toHaveCSS('transform', 'none');
      await expect(page.getByRole('region', { name: 'Practice results' })).toHaveCSS('opacity', '1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await popup.boundingBox(); expect(box!.y).toBeCloseTo(16, 0);
      await page.screenshot({ path: testInfo.outputPath(`pb-${mode}.png`), fullPage: true });
      await popup.screenshot({ path: testInfo.outputPath(`pb-toast-${mode}.png`) });
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Dismiss personal best' })).toBeFocused();
      if (width === 1440) await pauseToastExit(popup);
      await page.keyboard.press('Enter');
      if (width === 1440) await verifyToastExit(page);
      else await expect(popup).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
      await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Practice again' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('textbox', { name: /^Type the practice/ })).toBeFocused();
      await expect(popup).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

test('English 30s, English 60s and English 2k 25 words keep separate PBs', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const categories = [
    { mode: 'prose', language: 'english', test: 'time', length: 30 },
    { mode: 'prose', language: 'english', test: 'time', length: 60 },
    { mode: 'prose', language: 'english 2k', test: 'words', length: 25 },
  ] as const;
  const bests = { version: 2, bests: { [practiceCategoryKey(categories[0])]: 1, [practiceCategoryKey(categories[1])]: 9999, [practiceCategoryKey(categories[2])]: 1 } };
  await page.addInitScript(bests => localStorage.setItem('clumsy-keys:guest-personal-bests', JSON.stringify(bests)), bests);
  await page.goto('/');
  for (const seconds of [30, 60]) {
    await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
    await dialog.getByRole('button', { name: 'Timer', exact: true }).click();
    await dialog.getByLabel('Seconds', { exact: true }).fill(String(seconds));
    await dialog.getByRole('button', { name: 'Set timer', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
    const words = (await page.locator('.typing-word').allTextContents()).slice(0, 8).join(' ');
    await page.getByRole('textbox', { name: 'Type the practice passage' }).focus();
    await page.keyboard.type(words);
    await page.clock.fastForward(seconds * 1000 + 100);
    const popup = page.getByRole('complementary', { name: 'New personal best' });
    if (seconds === 30) await expect(popup).toContainText('English · 30s');
    else await expect(popup).toHaveCount(0);
    await page.getByRole('button', { name: 'Practice again', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Language', exact: true }).click();
  await dialog.getByRole('button', { name: 'English (Mid)', exact: true }).click();
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
  await dialog.getByRole('button', { name: 'Words', exact: true }).click();
  await dialog.getByLabel('Word count', { exact: true }).fill('25');
  await dialog.getByRole('button', { name: 'Set words', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
  await finishPractice(page, 'prose');
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toContainText('English 2k · 25 words');
});

test('guest baselines persist and retain higher in-memory bests when storage writes fail', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => { Math.random = () => 0; });
  await shortProse(page); await finishPractice(page, 'prose', 30);
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toHaveCount(0);
  const previous = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('clumsy-keys:guest-personal-bests')!).bests)[0] as number);
  expect(previous).toBeGreaterThan(0);
  await page.reload();
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'clumsy-keys:guest-personal-bests') throw new DOMException('Storage full', 'QuotaExceededError');
      setItem.call(this, key, value);
    };
  });
  await finishPractice(page, 'prose', 10);
  const popup = page.getByRole('complementary', { name: 'New personal best' });
  await expect(popup).toContainText(`Previous best: ${previous} WPM`);
  await expect(popup).toHaveCSS('transform', 'none');
  await pauseToastExit(popup);
  await page.clock.fastForward(8001);
  await verifyToastExit(page);
  await page.getByRole('button', { name: 'Practice again' }).click();
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toHaveCount(0);
  await finishPractice(page, 'prose', 20);
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toHaveCount(0);
});

test('signed-in PB uses saved bests, isolates guests and never celebrates history views', async ({ page }) => {
  await page.goto('/#/account');
  await page.getByLabel('Email', { exact: true }).fill(`pb-${randomUUID()}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Preferences synced.' })).toBeVisible();
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => /^sb-.*-auth-token$/.test(key))!;
    return JSON.parse(localStorage.getItem(key)!).access_token as string;
  });
  const saved = await page.request.post('http://127.0.0.1:15442/api/practice-results', {
    headers: { Authorization: `Bearer ${token}` }, data: {
      id: randomUUID(), mode: 'prose', language: 'english',
      settings: { language: 'english', timer: null, words: null, quotes: 'Random Quotes', quoteLength: 'short', numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
      stats: { correct: 8, incorrect: 0, extra: 0, elapsedSeconds: 120, samples: [], history: [] },
    },
  });
  expect(saved.status()).toBe(201);
  const unrelated = await page.request.post('http://127.0.0.1:15442/api/practice-results', {
    headers: { Authorization: `Bearer ${token}` }, data: {
      id: randomUUID(), mode: 'prose', language: 'english',
      settings: { language: 'english', timer: 120, words: null, quotes: null, numbers: null, punctuations: null, difficulty: { wpmLimit: null, timeLimit: null } },
      stats: { correct: 8000, incorrect: 0, extra: 0, elapsedSeconds: 120, samples: [], history: [] },
    },
  });
  expect(unrelated.status()).toBe(201);
  await page.evaluate(seed => localStorage.setItem('clumsy-keys:guest-personal-bests', JSON.stringify(seed)), { version: 2, bests: { [practiceCategoryKey(shortQuotes)]: 9999 } });
  let releaseSnapshot!: () => void;
  const snapshotGate = new Promise<void>(resolve => releaseSnapshot = resolve);
  await page.route('**/api/practice-personal-best?*', async route => { await snapshotGate; await route.continue(); });
  await shortProse(page); await finishPractice(page, 'prose');
  await expect(page.getByRole('status').filter({ hasText: 'Saving result…' })).toBeVisible();
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('clumsy-keys:pending-results')!) as { result: { id: string } }[]);
  expect(queued).toHaveLength(1);
  releaseSnapshot();
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toContainText('Previous best: 1 WPM');
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your account.' })).toBeVisible();
  await page.getByRole('link', { name: 'View history', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(3);
  await page.locator('.history-row').first().click();
  await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toHaveCount(0);

  // A failed snapshot suppresses claims while leaving the existing save path intact.
  await page.unroute('**/api/practice-personal-best?*');
  await page.route('**/api/practice-personal-best?*', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await shortProse(page); await finishPractice(page, 'prose');
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your account.' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'New personal best' })).toHaveCount(0);
});
