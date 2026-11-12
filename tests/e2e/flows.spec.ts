import { test, expect, type Page } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(theme => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
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
        await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
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
      await page.reload(); await expect(page.locator('main')).toHaveAttribute('data-theme', opposite);
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
