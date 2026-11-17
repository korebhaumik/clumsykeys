import { test, expect } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`custom dropdowns support pointer and keyboard in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.addInitScript(value => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', value); }, theme);
    await page.goto('/#/themes');
    const picker = page.getByRole('combobox', { name: 'Color theme' });
    await expect(page.locator('select')).toHaveCount(0);
    await expect(picker).toHaveAttribute('aria-describedby', 'theme-save-note');
    await picker.focus();
    await page.keyboard.press('Enter');
    await expect(picker).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { selected: true })).toHaveAccessibleName(theme === 'classic' ? 'Classic' : 'Dark Forest');
    await page.keyboard.press('Home');
    await page.keyboard.press('Escape');
    await expect(picker).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(picker).toHaveText('Classic');
    await page.keyboard.press('Space');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(picker).toHaveText('Dark Forest');
    await page.reload();
    await expect(picker).toHaveText('Dark Forest');
    await picker.click();
    await page.keyboard.press('c');
    await page.keyboard.press('Enter');
    await expect(picker).toHaveText('Classic');
    // Restore the theme under test before checking its popup appearance.
    await picker.click();
    await page.getByRole('option', { name: theme === 'classic' ? 'Classic' : 'Dark Forest', exact: true }).click();
    await picker.click();
    await page.screenshot({ path: testInfo.outputPath('theme-dropdown.png') });
    const spacing = await picker.evaluate(button => {
      const arrow = button.querySelector('svg')!.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      return rect.right - arrow.right;
    });
    expect(spacing).toBeGreaterThan(8);
    expect(spacing).toBeLessThan(20);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('listbox')).not.toBeVisible();
    await expect(picker).not.toBeFocused();
    await picker.click();
    await page.getByRole('heading', { name: 'Appearance' }).click();
    await expect(page.getByRole('listbox')).not.toBeVisible();

    // Code's inline dropdown is a desktop control; mobile language selection is tested in the settings dialog.
    await page.setViewportSize({ width: 1440, height: 844 });
    await page.goto('/#/game');
    const language = page.getByRole('combobox', { name: 'Snippet language' });
    const gap = async () => language.evaluate(button => {
      const label = button.querySelector('span')!.getBoundingClientRect();
      const arrow = button.querySelector('svg')!.getBoundingClientRect();
      return arrow.left - label.right;
    });
    expect(await gap()).toBeLessThanOrEqual(13);
    await language.click();
    const popup = page.getByRole('listbox', { name: 'Snippet language' });
    await expect(popup.getByRole('option', { name: 'JavaScript', exact: true })).toBeVisible();
    expect(await popup.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const popupBox = await popup.boundingBox();
    expect(popupBox!.x).toBeGreaterThanOrEqual(0);
    expect(popupBox!.x + popupBox!.width).toBeLessThanOrEqual(1440);
    await page.getByRole('option', { name: 'JavaScript', exact: true }).click();
    await expect(language).toBeFocused();
    expect(await gap()).toBeLessThanOrEqual(13);
    await expect(page.getByRole('region', { name: 'JavaScript snippet' })).toBeVisible();

    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/login');
    await page.getByLabel('Username', { exact: true }).fill('Ada');
    await page.getByLabel('Room ID', { exact: true }).fill(`dropdown-${theme}-${width}-${Date.now()}`);
    await page.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    const type = page.getByRole('combobox', { name: 'Test type' });
    await type.click();
    await page.getByRole('option', { name: 'Time', exact: true }).click();
    const duration = page.getByRole('combobox', { name: 'Time limit' });
    await duration.click();
    await page.getByRole('option', { name: '15 seconds', exact: true }).click();
    await expect(duration).toHaveText('15 seconds');
    await type.click();
    await page.getByRole('option', { name: 'Words', exact: true }).click();
    const count = page.getByRole('combobox', { name: 'Word count' });
    await count.click();
    await page.getByRole('option', { name: '50 words', exact: true }).click();
    await expect(count).toHaveText('50 words');
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.screenshot({ path: testInfo.outputPath('race-dropdown.png') });
    const menu = await page.getByRole('listbox').boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
    expect(menu!.y).toBeGreaterThanOrEqual(0);
    expect(menu!.y + menu!.height).toBeLessThanOrEqual(844);
    await page.getByRole('option', { name: 'Hinglish', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveText('Hinglish');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
