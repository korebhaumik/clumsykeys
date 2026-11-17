import { codeChoice } from './code-controls';
import { test, expect } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test.describe(`${theme} at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme);
        Math.random = () => 0;
      }, theme);
    });

    for (const mode of ['prose', 'keywords']) {
      test(`${mode} reset and replay support Tab then Enter`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(mode === 'prose' ? '/' : '/#/game');
        if (mode === 'prose') {
          await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
          const dialog = page.getByRole('dialog');
          await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
          await dialog.getByRole('button', { name: 'Quotes', exact: true }).click();
          await dialog.getByRole('button', { name: 'Short', exact: true }).click();
          await page.keyboard.press('Control+k');
        } else {
          await codeChoice(page, 'Practice Mode', 'Keywords');
        }
        const input = page.getByRole('textbox', {
          name: mode === 'prose' ? 'Type the practice passage' : 'Type the practice keywords',
        });
        const reset = page.getByRole('button', { name: mode === 'prose' ? 'reset' : 'Reset code practice', exact: true });
        const settings = page.getByRole('button', { name: 'Test Settings', exact: true });

        for (const started of [false, true]) for (const activation of ['Enter', 'Space']) {
          await input.focus();
          if (started) {
            await page.keyboard.type('x');
            await expect(settings).toBeDisabled();
          }
          const previousInput = await input.elementHandle();
          await page.keyboard.press('Tab');
          await expect(reset).toBeFocused();
          expect(await reset.evaluate(element => element.matches(':focus-visible'))).toBe(true);
          await expect(reset).toHaveCSS('outline-style', 'solid');
          await page.keyboard.press('Shift+Tab');
          await expect(input).toBeFocused();
          await page.keyboard.press('Tab');
          await expect(reset).toBeFocused();
          await page.keyboard.press(activation);
          await expect(input).toBeFocused();
          await expect.poll(() => previousInput!.evaluate(element => element.isConnected)).toBe(false);
          await previousInput!.dispose();
          await expect(settings).toBeEnabled();
          await expect(page.locator('.typing-frame')).toHaveClass(/caret-idle/);
          await expect(page.locator('.typing-window .text-white, .typing-window .text-red-500')).toHaveCount(0);
        }

        // Completion moves focus to the results heading. Replay must be the next
        // Tab stop even with WebKit's default button-skipping preference.
        const words = page.locator(mode === 'prose' ? '.typing-word' : '.code-line-text > span');
        await page.keyboard.type((await words.allTextContents()).join(' '));
        await expect(page.getByRole('heading', { name: 'Practice results' })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Practice again', exact: true })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(input).toBeFocused();
        await expect(settings).toBeEnabled();
        await page.keyboard.type('x');
        await expect(settings).toBeDisabled();
        expect(errors).toEqual([]);
      });
    }

    test('snippets retain Tab indentation and the Shift+Tab+Enter reset chord', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#/game');
      await codeChoice(page, 'Indentation', 'Manual Tabs');
      const input = page.getByRole('textbox', { name: 'Type the practice snippet' });
      await input.focus();
      const lines = await page.locator('.code-line').evaluateAll(lines => lines.map(line => ({
        indents: line.querySelectorAll(':scope > svg').length,
        words: Array.from(line.querySelector('.code-line-text')!.children, word => word.textContent ?? ''),
      })));
      const indentedLine = lines.findIndex(line => line.indents > 0);
      expect(indentedLine).toBeGreaterThan(0);
      for (const line of lines.slice(0, indentedLine)) {
        await page.keyboard.type(line.words.join(' '));
        await page.keyboard.press('Enter');
      }
      const previousInput = await input.elementHandle();
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();
      expect(await previousInput!.evaluate(element => element.isConnected)).toBe(true);
      await expect(page.locator('.code-line').nth(indentedLine).locator(':scope > svg').first()).toHaveAttribute('style', /color:/);

      await page.keyboard.down('Shift');
      await page.keyboard.down('Tab');
      await expect(input).not.toBeFocused();
      await page.keyboard.press('Enter');
      await page.keyboard.up('Tab');
      await page.keyboard.up('Shift');
      await expect(input).toBeFocused();
      await expect.poll(() => previousInput!.evaluate(element => element.isConnected)).toBe(false);
      await previousInput!.dispose();
      await expect(page.locator('.typing-frame')).toHaveClass(/caret-idle/);
      await expect(page.getByRole('button', { name: 'Test Settings', exact: true })).toBeEnabled();
      expect(errors).toEqual([]);
    });
  });
}
