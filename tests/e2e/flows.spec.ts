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
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/');
      await page.getByRole('button', { name: 'quotes', exact: true }).click();
      await page.addStyleTag({ content: '.practice-results { animation-play-state: paused !important; }' });
      const input = page.getByRole('textbox', { name: 'Type the practice passage' });
      await input.focus();
      await expect(input).toBeFocused();
      const passage = (await page.locator('.typing-window .typing-word').allTextContents()).join(' ');
      const firstLetter = page.locator('.typing-window .typing-word:first-child > span:first-child > span:first-child');
      const unfinishedColor = theme === 'classic' ? 'rgb(102, 102, 102)' : 'rgb(132, 136, 135)';
      await expect(firstLetter).toHaveCSS('color', unfinishedColor);
      const settings = page.getByRole('region', { name: 'Test settings' });
      await expect(settings.getByRole('button', { name: 'punctuations' })).toBeVisible();
      await settings.evaluate(section => {
        const observer = new window.MutationObserver(() => {
          if (!section.querySelector('[aria-label="Live test stats"]')) return;
          section.setAttribute('data-options-at-start', String(section.querySelectorAll('.config-options').length));
          observer.disconnect();
        });
        observer.observe(section, { childList: true, subtree: true });
      });
      await page.keyboard.type('X');
      await expect(settings).toHaveAttribute('data-options-at-start', '0');
      await page.keyboard.press('Backspace');
      await expect(firstLetter).toHaveCSS('color', unfinishedColor);
      await page.keyboard.type(passage[0]);
      await expect(firstLetter).toHaveCSS('color', theme === 'classic' ? 'rgb(0, 0, 0)' : 'rgb(218, 218, 218)');
      await page.keyboard.type(passage.slice(1));
      await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
      await expectEntranceFade(page.getByRole('region', { name: 'Practice results' }));
      await expect(page.locator('.history-word')).toHaveCount(passage.split(' ').length);
      await page.locator('.history-word').first().click();
      await expect(page.locator('.history-detail')).toContainText(passage.split(' ')[0]);
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
    test('ClumsyDevs switches between snippets and randomized keyword practice', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 844 });
      await page.goto('/#/game');
      await expect(page.getByRole('region', { name: 'Python snippet' })).toBeVisible();
      const mode = await page.getByRole('group', { name: 'Practice mode' }).boundingBox();
      const settings = await page.getByRole('button', { name: 'Test Settings', exact: true }).boundingBox();
      const snippet = await page.locator('.snippet-selector').boundingBox();
      const toolbar = await page.locator('.toolbar-row').boundingBox();
      expect(mode!.y).toBe(settings!.y);
      expect(mode!.x).toBeGreaterThan(settings!.x + settings!.width);
      expect(snippet!.x).toBeGreaterThan(mode!.x + mode!.width);
      expect(snippet!.x + snippet!.width).toBeLessThan(toolbar!.x + toolbar!.width);
      await expect(page.getByRole('button', { name: 'Snippets', exact: true })).toHaveCSS('text-decoration-line', 'underline');
      await page.setViewportSize({ width: 320, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Keywords', exact: true }).click();
      await expect(page.getByRole('group', { name: 'Indentation' })).toHaveCount(0);
      const input = page.getByRole('textbox', { name: 'Type the practice keywords' });
      await expect(input).toBeFocused();
      await page.getByRole('combobox', { name: 'Keyword language' }).selectOption({ label: 'JavaScript' });
      const region = page.getByRole('region', { name: 'JavaScript keywords' });
      const words = region.locator('.code-line-text > span');
      await expect(words).toHaveCount(25);
      const wordCount = page.getByRole('group', { name: 'Word count' });
      await expect(page.locator('.toolbar-row').getByRole('group', { name: 'Keyword test type' })).toBeVisible();
      await expect(page.locator('.toolbar-row').getByRole('group', { name: 'Keyword modifiers' })).toHaveCount(0);
      await wordCount.getByRole('button', { name: '50', exact: true }).click();
      await expect(words).toHaveCount(50);
      await wordCount.getByRole('button', { name: '25', exact: true }).click();
      const original = await words.allTextContents();
      expect(original[0]).toBe('var');
      await page.evaluate(() => { Math.random = () => 0.99; });
      const numbers = page.getByRole('button', { name: 'Numbers', exact: true });
      const punctuation = page.getByRole('button', { name: 'Punctuation', exact: true });
      await numbers.click();
      await expect(words.nth(5)).toHaveText(/^\d{2}$/);
      await punctuation.click();
      await expect(words.nth(3)).toHaveText(/[,.!?;:]$/);
      const decorated = await words.allTextContents();
      await expect(page.getByRole('button', { name: 'New keywords', exact: true })).toHaveCount(0);
      await page.reload();
      await expect(region).toBeVisible();
      await expect(numbers).toHaveAttribute('aria-pressed', 'true');
      await expect(punctuation).toHaveAttribute('aria-pressed', 'true');
      expect(await words.allTextContents()).not.toEqual(decorated);
      await numbers.click();
      await punctuation.click();
      const refreshed = await words.allTextContents();
      expect(refreshed).toEqual(original);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      const passage = refreshed.join(' ');
      await page.keyboard.type(passage.slice(0, -1));
      expect(await region.locator('.typing-window').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      await page.keyboard.type(passage.slice(-1));
      await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
      await expect(page.locator('.result-metrics')).toContainText('JavaScript keywords');
      await expect(page.locator('.result-headline')).toContainText('100%');
      await page.getByRole('button', { name: 'Practice again' }).click();
      await expect(input).toBeFocused();
      await page.getByRole('button', { name: 'Snippets', exact: true }).click();
      await expect(page.getByRole('region', { name: 'JavaScript snippet' })).toBeVisible();
      await expect(page.getByRole('group', { name: 'Indentation' })).toBeVisible();
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

test('ClumsyDevs timed keywords finish when the selected duration expires', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.clock.install();
  await page.goto('/#/game');
  await page.getByRole('button', { name: 'Keywords', exact: true }).click();
  await page.getByRole('button', { name: 'Time', exact: true }).click();
  await page.getByRole('group', { name: 'Duration in seconds' }).getByRole('button', { name: '15', exact: true }).click();
  const first = page.locator('.keyword-passage .code-line-text > span').first();
  await page.keyboard.type((await first.textContent())![0]);
  await expect(page.getByRole('group', { name: 'Live test stats' })).toBeVisible();
  await page.clock.fastForward(15_000);
  await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
});

test('prose uses Hinglish words, applies the toggles and accepts composed text', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('button', { name: 'Hinglish', exact: true }).click();
  const words = page.locator('.typing-window .typing-word');
  await expect(words.first()).toHaveText(/^[a-z]+$/i);
  const first = (await words.first().textContent())!;
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('textbox', { name: 'Type the practice passage' }).focus();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.imeSetComposition', { text: first, selectionStart: first.length, selectionEnd: first.length });
  await cdp.send('Input.insertText', { text: first });
  await expect(words.first().locator('.text-white')).toHaveCount(first.length);
  await expect(words.first().locator('.text-red-500')).toHaveCount(0);

  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();
  await page.getByRole('button', { name: 'Insane', exact: true }).click();
  await expect(words.nth(1)).toHaveText(/^\d{2}$/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Punctuations', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(words.nth(3)).toHaveText(/^\d{2}[,.!?"':;]$/);
  await page.getByRole('button', { name: 'None', exact: true }).click();
  await expect(words.nth(3)).toHaveText(/^\d{2}$/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Numbers', exact: true }).click();
  await page.getByRole('button', { name: 'None', exact: true }).click();
  await expect(words.nth(1)).toHaveText(/^[a-z]+$/i);
});

test('prose honors a custom word count and finishes when the timer expires', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 560 });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Type the practice passage' });
  await expect(input).toBeFocused();
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Test Type', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Test Type' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByLabel('Word count', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Set words', exact: true }).click();
  const words = page.locator('.typing-window .typing-word');
  await expect(words).toHaveCount(10);

  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByLabel('Seconds', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Set timer', exact: true }).click();
  await expect(words).toHaveCount(25);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(input).toBeFocused();
  const first = (await words.first().textContent())![0];
  await page.keyboard.type(first);
  await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused({ timeout: 8000 });
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
