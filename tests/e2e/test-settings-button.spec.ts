import { test, expect } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  for (const mode of ['prose', 'code']) {
    test(`test settings disable during ${mode} practice in ${theme} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 844 });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      await page.goto(mode === 'code' ? '/#/game' : '/');

      const settings = page.getByRole('button', { name: 'Test Settings', exact: true });
      const input = page.getByRole('textbox', {
        name: mode === 'code' ? 'Type the practice snippet' : 'Type the practice passage',
      });
      await expect(settings).toBeEnabled();
      const appearance = await settings.evaluate(button => {
        const style = getComputedStyle(button);
        return { color: style.color, borderColor: style.borderColor, opacity: style.opacity };
      });
      await input.focus();
      await page.keyboard.type('x');
      await expect(settings).toBeDisabled();
      await expect(settings).toHaveCSS('color', appearance.color);
      await expect(settings).toHaveCSS('border-color', appearance.borderColor);
      await expect(settings).toHaveCSS('opacity', appearance.opacity);

      // Native disabled controls reject clicks and cannot receive keyboard focus.
      await settings.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.focus();
      });
      await expect(settings).not.toBeFocused();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await input.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(settings).not.toBeFocused();

      await page.getByRole('button', {
        name: mode === 'code' ? 'Reset code practice' : 'reset', exact: true,
      }).click();
      await expect(settings).toBeEnabled();
      await settings.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
