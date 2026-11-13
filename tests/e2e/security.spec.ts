import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) {
  test(`account metadata stays text and browser auth uses a public key in ${theme}`, async ({ page }) => {
    const errors: string[] = [], dialogs: string[] = [], keys: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    page.on('request', request => { const key = request.headers().apikey; if (key) keys.push(key); });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    const name = '<img src=x onerror=alert(1)>';
    await page.getByLabel('Display name', { exact: true }).fill(name);
    await page.getByLabel('Email', { exact: true }).fill(`security-${theme}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Register', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('img[onerror]')).toHaveCount(0);
    expect(keys.length).toBeGreaterThan(0); expect(keys.every(key => key === 'sb_publishable_test')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]); expect(dialogs).toEqual([]);
  });
}
