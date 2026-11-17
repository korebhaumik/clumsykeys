import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1920]) {
  test(`shared footer and centered content in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1200 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    for (const route of ['/', '/game', '/about', '/themes', '/account', '/login', '/history', '/leaderboard', '/security', '/terms', '/privacy']) {
      await page.goto('/#' + route);
      const policyTitles: Record<string, string> = { '/security': 'Application Security', '/terms': 'Terms of Service', '/privacy': 'Privacy Policy' };
      if (policyTitles[route]) await expect(page.getByRole('heading', { level: 1, name: policyTitles[route], exact: true })).toBeVisible();
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(footer.getByRole('link', { name: width === 320 ? 'Github' : 'Contact', exact: true })).toBeVisible();
      await expect(footer.getByRole('link', { name: 'Kore Bhaumik', exact: true })).toBeVisible();
      await expect(footer.getByRole('link', { name: 'Support', exact: true })).toHaveAttribute('href', /^mailto:/);
      await expect(footer.getByRole('link')).toHaveCount(width === 320 ? 3 : 7);
      for (const label of ['Contact', 'Security', 'Terms', 'Privacy']) {
        if (width === 320) await expect(footer.getByRole('link', { name: label, exact: true })).toHaveCount(0);
        else await expect(footer.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const bottomSpace = await footer.evaluate(element => {
        const credits = element.querySelector('.footer-credits')!.getBoundingClientRect();
        return element.getBoundingClientRect().bottom - credits.bottom;
      });
      expect(bottomSpace).toBeGreaterThanOrEqual(16);
      if (width === 1920 && route !== '/leaderboard') {
        const geometry = await page.evaluate(() => {
          const footer = document.querySelector('.global-footer')!.getBoundingClientRect();
          return { bottom: footer.bottom, expected: Math.max(window.innerHeight, document.documentElement.scrollHeight) - parseFloat(getComputedStyle(document.querySelector('.app-frame')!).paddingBottom) };
        });
        expect(Math.abs(geometry.bottom - geometry.expected)).toBeLessThan(2);
      }
    }
    await page.goto('/');
    await expect(page.locator('.practice-shell > header')).toBeVisible();
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
