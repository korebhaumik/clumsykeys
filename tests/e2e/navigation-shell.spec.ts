import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`keeps the header mounted across navigation in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
    const header = await page.locator('.route-shell > header').elementHandle();
    const footer = await page.getByRole('contentinfo').elementHandle();

    for (const [label, heading] of [['Settings', 'Appearance'], ['About', 'About Clumsy Keys'], ['Settings', 'Appearance']]) {
      const previousContent = await page.locator('.route-content').elementHandle();
      if (width === 320) {
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: label, exact: true }).click();
        await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
      } else {
        const button = page.getByRole('button', { name: label, exact: true });
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(button).toBeFocused();
      }
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await header!.evaluate(element => element.isConnected && element === document.querySelector('.route-shell > header'))).toBe(true);
      expect(await footer!.evaluate(element => element.isConnected)).toBe(true);
      expect(await previousContent!.evaluate(element => element.isConnected)).toBe(false);
      expect(await header!.evaluate(element => element.closest('.route-content'))).toBeNull();
      await expect(page.locator('.route-shell > header')).toHaveCount(1);
      await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${label}-${theme}-${width}.png`), fullPage: true });
    }

    // Changing practice mode updates the existing header; typing still hides its controls.
    await page.locator('.route-shell > header').getByRole('link', { name: 'Switch to code practice' }).click();
    const input = page.getByRole('textbox', { name: 'Type the practice snippet' });
    await expect(input).toBeFocused();
    await expect(page.getByRole('link', { name: 'Clumsy Devs home', exact: true })).toBeVisible();
    expect(await header!.evaluate(element => element.isConnected)).toBe(true);
    await input.press('x');
    await expect(page.locator('.route-shell > header')).toHaveClass(/active-test/);
    await page.getByRole('button', { name: 'Reset code practice' }).click();
    await expect(page.locator('.route-shell > header')).not.toHaveClass(/active-test/);
    expect(errors).toEqual([]);
  });
}
