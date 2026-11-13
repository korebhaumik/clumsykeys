import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1920]) {
  test(`shared footer and centered content in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1200 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    for (const route of ['/', '/game', '/about', '/themes', '/account', '/login', '/history', '/leaderboard']) {
      await page.goto('/#' + route);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(footer.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
      await expect(footer.getByRole('link', { name: 'Discord', exact: true })).toBeVisible();
      await expect(footer.getByRole('link', { name: 'Kore Bhaumik', exact: true })).toBeVisible();
      for (const label of ['Security', 'Terms', 'Privacy', 'Support']) await expect(footer.getByText(label, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 1920 && route !== '/leaderboard') {
        const geometry = await page.evaluate(() => {
          const footer = document.querySelector('.global-footer')!.getBoundingClientRect();
          return { bottom: footer.bottom, expected: window.innerHeight - parseFloat(getComputedStyle(document.querySelector('.app-frame')!).paddingBottom) };
        });
        expect(Math.abs(geometry.bottom - geometry.expected)).toBeLessThan(2);
      }
    }
    await page.goto('/');
    if (width === 1920) {
      const alignment = await page.evaluate(() => {
        const header = document.querySelector('.practice-shell > header')!.getBoundingClientRect();
        const content = document.querySelector('.practice-content')!.getBoundingClientRect();
        const shortcuts = document.querySelector('.practice-shortcuts')!.getBoundingClientRect();
        return { actual: (content.top + content.bottom) / 2, expected: (header.bottom + shortcuts.top) / 2 };
      });
      expect(Math.abs(alignment.actual - alignment.expected)).toBeLessThan(3);
    }
    await page.screenshot({ path: testInfo.outputPath(`practice-layout-${theme}-${width}.png`), fullPage: true });
    await page.goto('/#/account');
    await page.screenshot({ path: testInfo.outputPath(`account-layout-${theme}-${width}.png`), fullPage: true });
    const content = await page.locator('.account-page').boundingBox(), footer = await page.getByRole('contentinfo').boundingBox();
    expect(content!.y + content!.height).toBeLessThanOrEqual(footer!.y);
    expect(errors).toEqual([]);
  });
}
