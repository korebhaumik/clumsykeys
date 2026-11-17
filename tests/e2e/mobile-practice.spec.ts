import { codeChoice } from './code-controls';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Virtual keyboards can send input/beforeinput without physical keydown events.
async function text(input: Locator, value: string) {
  for (const letter of value) await input.evaluate((element: HTMLInputElement, letter) => {
    element.value += letter;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letter }));
  }, letter);
}
async function edit(input: Locator, inputType: string) {
  await input.evaluate((element, inputType) => element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType })), inputType);
}

async function doubleTapPrompt(page: Page) {
  const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
  await prompt.tap();
  await prompt.tap();
}

for (const theme of ['dark-forest', 'classic']) {
  test.describe(`touch practice in ${theme}`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
    });

    test('idle practice centers, rises on focus and centers again on blur', async ({ page }) => {
      for (const route of ['/', '/#/game']) {
        await page.goto(route);
        const centered = () => page.locator('.practice-content').evaluate(element => {
          const box = element.getBoundingClientRect();
          const header = document.querySelector('.page-shell > header')!.getBoundingClientRect();
          const shell = document.querySelector('.page-shell')!.getBoundingClientRect();
          return Math.abs((box.top + box.bottom) / 2 - (header.bottom + shell.bottom) / 2) < 3;
        });
        await expect.poll(centered).toBe(true);
        const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
        await expect(prompt).toHaveCSS('backdrop-filter', 'blur(3px)');
        const overlay = await prompt.boundingBox();
        const passage = await page.locator('.typing-window').boundingBox();
        expect(overlay!.y).toBeCloseTo(passage!.y, 0);
        expect(overlay!.height).toBeCloseTo(passage!.height, 0);
        await prompt.tap();
        await expect(page.locator('#boss')).not.toBeFocused();
        await expect.poll(centered).toBe(true);
        await prompt.tap();
        await expect(page.locator('#boss')).toBeFocused();
        await expect.poll(() => page.locator('.practice-content').evaluate(element =>
          element.getBoundingClientRect().top - document.querySelector('.page-shell > header')!.getBoundingClientRect().bottom < 20)).toBe(true);
        await page.locator('#boss').evaluate((element: HTMLInputElement) => element.blur());
        await expect.poll(centered).toBe(true);
      }
    });

    test('focus overlay retains Enter and Space activation', async ({ page }) => {
      for (const route of ['/', '/#/game']) for (const key of ['Enter', 'Space']) {
        await page.goto(route);
        await page.locator('#boss').evaluate((element: HTMLInputElement) => element.blur());
        const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
        await prompt.focus();
        await prompt.press(key);
        await expect(page.locator('#boss')).toBeFocused();
      }
    });

    test('visual-viewport-only keyboard changes leave the code passage visible', async ({ page }) => {
      await page.goto('/#/game');
      await doubleTapPrompt(page);
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport!, 'height', { configurable: true, get: () => 320 });
        window.visualViewport!.dispatchEvent(new Event('resize'));
      });
      await expect.poll(() => page.locator('.typing-window').evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.top >= 15 && box.bottom <= 305;
      })).toBe(true);
      expect(await page.evaluate(() => innerHeight)).toBe(844);
      await page.locator('#boss').evaluate((element: HTMLInputElement) => element.blur());
      await expect(page.locator('.practice-body')).not.toHaveAttribute('style', /--typing-keyboard-inset/);
    });

    test('passages stay visible in a shortened keyboard viewport and touch deletion works', async ({ page }, testInfo) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/', '/#/game']) {
        await page.goto(route);
        await expect(page.getByText('Double tap here to start playing', { exact: true })).toBeVisible();
        await expect(page.locator('.footer-shortcuts')).not.toBeVisible();
        if (route.includes('game')) {
          const box = await page.locator('.code-toolbar').boundingBox();
          expect(box!.height).toBeLessThanOrEqual(160);
        }
        await doubleTapPrompt(page);
        const input = page.locator('#boss');
        await expect(input).toBeFocused();
        await expect(input).toHaveCSS('font-size', '16px');
        await page.setViewportSize({ width: 390, height: 355 });
        await expect.poll(() => page.locator('.typing-frame').evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.top >= 15 && box.bottom <= (window.visualViewport?.height ?? innerHeight) - 15;
        })).toBe(true);
        const first = page.locator('.typing-window .text-zinc-600 > span').first();
        const expected = await first.textContent();
        await text(input, expected!);
        await expect(page.locator('.typing-window .text-white')).toHaveCount(1);
        await expect(page.getByText('Double tap here to start playing', { exact: true })).not.toBeVisible();
        await edit(input, 'deleteContentBackward');
        await expect(page.locator('.typing-window .text-white')).toHaveCount(0);
        await text(input, expected!);
        await expect(page.locator('.typing-window .text-white')).toHaveCount(1);
        await page.screenshot({ path: testInfo.outputPath(route.includes('game') ? 'code-keyboard-height.png' : 'prose-keyboard-height.png') });
        await page.setViewportSize({ width: 390, height: 844 });
      }
      expect(errors).toEqual([]);
    });

    test('snippets complete using virtual text, Return and touch indentation', async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('/#/game');
      await codeChoice(page, 'Snippet length', 'Short');
      await codeChoice(page, 'Indentation', 'Manual Tabs');
      const lines = await page.locator('.code-line').evaluateAll(lines => lines.map(line => ({
        indents: line.querySelectorAll(':scope > svg').length,
        text: Array.from(line.querySelector('.code-line-text')!.children, word => word.textContent).join(' '),
      })));
      const input = page.locator('#boss');
      await input.focus();
      for (const [index, line] of lines.entries()) {
        if (index) await edit(input, 'insertLineBreak');
        for (let n = 0; n < line.indents; n++) {
          await page.getByRole('button', { name: 'Insert indentation' }).tap();
          await expect(input).toBeFocused();
        }
        await text(input, line.text);
      }
      await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
      await expect(page.locator('.result-headline')).toContainText('100%');
      expect(errors).toEqual([]);
    });

    test('keyword options remain available through the compact settings entry', async ({ page }) => {
      await page.goto('/#/game');
      await codeChoice(page, 'Practice Mode', 'Keywords');
      await page.getByRole('button', { name: 'Test Settings', exact: true }).tap();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Test Type', exact: true }).tap();
      await dialog.getByRole('button', { name: 'Words', exact: true }).tap();
      await dialog.getByRole('button', { name: '50 words', exact: true }).tap();
      await dialog.getByRole('button', { name: 'Back', exact: true }).tap();
      await dialog.getByRole('button', { name: 'Close settings' }).tap();
      await expect(page.locator('.code-toolbar button:visible')).toHaveCount(1);
      await expect(page.locator('.code-toolbar button:visible')).toHaveText('Test Settings');
      await expect(page.locator('.code-line-text > span')).toHaveCount(50);
    });
  });
}
