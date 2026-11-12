import { test, expect, type Locator } from '@playwright/test';

async function appearance(dialog: Locator) {
  return dialog.evaluate(element => {
    const selectors = ['', '.settings-dialog-header', '.settings-dialog-body', '.settings-choice', '.settings-dialog-footer'];
    return selectors.map(selector => {
      const style = getComputedStyle(selector ? element.querySelector(selector)! : element);
      return [style.backgroundColor, style.color, style.borderRadius, style.padding, style.fontSize, style.width];
    });
  });
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`code settings match prose and apply changes in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.addInitScript(value => {
      localStorage.setItem('theme', value);
      Math.random = () => 0.25;
    }, theme);

    await page.goto('/');
    await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const proseAppearance = await appearance(dialog);
    await page.keyboard.press('Escape');
    await page.goto('/#/game');
    const opener = page.getByRole('button', { name: 'Test Settings', exact: true });
    await opener.click();
    await expect(dialog.getByRole('heading', { name: 'Test Settings', exact: true })).toBeFocused();
    expect(await appearance(dialog)).toEqual(proseAppearance);
    await page.screenshot({ path: testInfo.outputPath('code-settings.png'), animations: 'disabled' });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);

    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close settings' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Language', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Language', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Language', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'JavaScript', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'JavaScript', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'JavaScript snippet' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('heading', { name: 'Test Settings', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Indentation', exact: true }).click();
    await dialog.getByRole('button', { name: 'Manual Tabs', exact: true }).click();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close settings' }).click();
    await expect(opener).toBeFocused();
    await expect(page.getByRole('button', { name: 'Manual Tabs', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await opener.click();
    await dialog.getByRole('button', { name: 'Practice Mode', exact: true }).click();
    await dialog.getByRole('button', { name: 'Keywords', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('button', { name: 'Indentation', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
    await dialog.getByRole('button', { name: '50 words', exact: true }).click();
    const words = page.locator('.keyword-passage .code-line-text > span');
    await expect(words).toHaveCount(50);
    await dialog.getByRole('button', { name: 'Timer', exact: true }).click();
    await dialog.getByRole('button', { name: '15 seconds', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '15 seconds', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Words', exact: true }).click();
    await expect(words).toHaveCount(25);
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Numbers', exact: true }).click();
    await dialog.getByRole('button', { name: 'On', exact: true }).click();
    await expect(words.nth(5)).toHaveText(/^\d{2}$/);
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('button', { name: 'Punctuations', exact: true }).click();
    await dialog.getByRole('button', { name: 'On', exact: true }).click();
    await expect(words.nth(3)).toHaveText(/[,.!?;:]$/);
    await dialog.getByRole('button', { name: 'None', exact: true }).click();
    await expect(words.nth(3)).not.toHaveText(/[,.!?;:]$/);
    await page.keyboard.press('Control+k');
    await expect(dialog).not.toBeVisible();
    await page.getByRole('textbox', { name: 'Type the practice keywords' }).focus();
    await page.keyboard.press('Meta+k');
    await expect(dialog.getByRole('heading', { name: 'Test Settings', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: 'Type the practice keywords' })).toBeFocused();

    await page.reload();
    await expect(page.getByRole('region', { name: 'JavaScript keywords' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Numbers', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await opener.click();
    await page.mouse.click(1, 1);
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
