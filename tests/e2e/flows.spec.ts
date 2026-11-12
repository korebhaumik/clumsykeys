import { test, expect, type Locator, type Page } from '@playwright/test';

async function expectEntranceFade(content: Locator) {
  await expect(content).toHaveCSS('opacity', '0');
  const fade = await content.evaluate(element => {
    const [animation] = element.getAnimations();
    animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    const opacity = Number(window.getComputedStyle(element).opacity);
    const during = element.getBoundingClientRect().toJSON();
    animation.finish();
    return { opacity, during, after: element.getBoundingClientRect().toJSON() };
  });
  expect(fade.opacity).toBeGreaterThan(0);
  expect(fade.opacity).toBeLessThan(1);
  expect(fade.during).toEqual(fade.after);
  await expect(content).toHaveCSS('opacity', '1');
}

for (const theme of ['dark-forest', 'classic']) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(theme => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
    });

    test('paints the saved theme before mount and fades in pages without shifting layout', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const entry = Promise.withResolvers<void>();
      await page.route(/\/src\/main\.ts(?:\?|$)/, async route => {
        await entry.promise;
        await route.continue();
      });

      const background = theme === 'classic' ? 'rgb(243, 244, 246)' : 'rgb(21, 27, 29)';
      const html = page.locator('html');
      try {
        await page.goto('/', { waitUntil: 'commit' });
        await expect(html).toHaveCSS('background-color', background);
        await expect(page.locator('main')).toHaveCount(0);
        await page.addStyleTag({ content: '.route-content { animation-play-state: paused !important; }' });
      } finally {
        entry.resolve();
      }

      const content = page.locator('.route-content');
      await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
      await expect(content).toHaveCSS('opacity', '0');
      await expect(html).toHaveCSS('background-color', background);

      await page.goto('/#/themes');
      await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
      await expect(content).toHaveCount(1);
      await expectEntranceFade(content);
      expect(errors).toEqual([]);
    });

    test('prose correction, completion, results and replay', async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      const input = page.getByRole('textbox', { name: 'Type the practice passage' });
      await expect(input).toBeFocused();
      await page.keyboard.type('X'); await page.keyboard.press('Backspace');
      await page.keyboard.type('The quick brown fox jumps over the lazy dog.');
      await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
      await expect(page.locator('.history-word')).toHaveCount(9);
      await page.locator('.history-word').first().click();
      await expect(page.locator('.history-detail')).toContainText('The');
      await page.getByRole('button', { name: 'Practice again' }).click();
      await expect(input).toBeFocused();
      expect(errors).toEqual([]);
    });

    test('all code languages complete with automatic and manual indentation', async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/#/game');
      for (const manual of [false, true]) for (const language of ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C']) {
        await page.getByRole('combobox', { name: 'Snippet language' }).selectOption({ label: language });
        await page.getByRole('button', { name: manual ? 'Manual Tabs' : 'Auto Tabs', exact: true }).click();
        const lines = await page.locator('.code-line').evaluateAll(lines => lines.map(line => ({
          indents: line.querySelectorAll(':scope > svg').length,
          words: Array.from(line.querySelector('.code-line-text')!.children, word => word.textContent ?? ''),
        })));
        await page.getByRole('textbox', { name: 'Type the practice snippet' }).focus();
        for (const [index, line] of lines.entries()) {
          if (index) await page.keyboard.press('Enter');
          if (manual) for (let n = 0; n < line.indents; n++) await page.keyboard.press('Tab');
          for (const [wordIndex, word] of line.words.entries()) {
            if (wordIndex) await page.keyboard.press('Space');
            await page.keyboard.type(word);
          }
        }
        await expect(page.getByRole('region', { name: 'Practice results' })).toHaveCSS('animation-name', 'page-enter');
        await expect(page.locator('.result-headline')).toContainText('100%');
        await page.getByRole('button', { name: 'Practice again' }).click();
      }
      expect(errors).toEqual([]);
    });

    test('settings, persistent theme, navigation, and mobile layout', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Language', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Close settings' }).click();
      await page.goto('/#/themes');
      const opposite = theme === 'classic' ? 'dark-forest' : 'classic';
      await page.getByLabel('Color theme').selectOption(opposite);
      await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of ['/', '/game', '/themes', '/about', '/login', '/leaderboard']) {
          await page.goto('/#' + route);
          await expect(page.locator('main')).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByText('Code practice', { exact: true }).click();
      await expect(page.getByRole('region', { name: 'Python snippet' })).toBeVisible();
    });
  });
}

test('route changes and practice results skip the entrance animation with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/#/themes');
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await expect(page.locator('.route-content')).toHaveCSS('animation-name', 'none');
  await page.goto('/#/game');
  await expect(page.getByRole('textbox', { name: 'Type the practice snippet' })).toBeFocused();
  await expect(page.locator('.route-content')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await page.goto('/#/');
  await page.getByRole('button', { name: 'quotes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Type the practice passage' }).focus();
  await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
  await page.keyboard.type((await page.locator('.typing-window .typing-word').allTextContents()).join(' '));
  const results = page.getByRole('region', { name: 'Practice results' });
  await expect(results).toHaveCSS('animation-name', 'none');
  await expect(results).toHaveCSS('opacity', '1');
});

async function join(page: Page, username: string, room: string) {
  await page.goto('/#/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Room ID', { exact: true }).fill(room);
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
}

test('two browsers join, configure, vote, race, reconnect, see results and replay', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    const [a, b] = await Promise.all(contexts.map(c => c.newPage()));
    const errors: string[] = []; for (const p of [a, b]) p.on('pageerror', e => errors.push(e.message));
    const room = 'e2e-' + Date.now();
    await join(a, 'Ada', room); await join(b, 'Lin', room);
    await expect(a.getByRole('button', { name: 'Vote to start' })).toBeEnabled();
    await a.getByRole('button', { name: 'Vote to start' }).click();
    await b.getByRole('button', { name: 'Vote to start' }).click();
    await expect(a.getByRole('textbox', { name: 'Type the race passage' })).toBeEnabled({ timeout: 10000 });
    const words = await a.locator('.race-passage .typing-word').allTextContents();
    await a.keyboard.type(words[0] + ' ');
    await a.reload();
    await expect(a.getByRole('textbox', { name: 'Type the race passage' })).toBeEnabled();
    await a.keyboard.type(words.slice(1).join(' '));
    await b.getByRole('textbox', { name: 'Type the race passage' }).focus();
    await b.keyboard.type(words.join(' '));
    await expect(a.getByRole('heading', { name: 'Race results' })).toBeVisible();
    await expect(b.getByRole('heading', { name: 'Race results' })).toBeVisible();
    await expect(a.locator('tbody tr')).toHaveCount(2);
    await a.getByRole('button', { name: 'Race again' }).click();
    await expect(a.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
