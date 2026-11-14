import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 768, 1440]) {
  test(`about page layout and keyboard navigation in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/about');

    await expect(page.getByRole('heading', { name: 'About Clumsy Keys', exact: true })).toBeVisible();
    const modes = page.getByRole('navigation', { name: 'Practice modes' });
    await expect(modes.getByRole('link')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const content = await page.locator('.about-page').boundingBox();
    const container = await page.locator('.practice-content').boundingBox();
    expect(content!.x).toBeCloseTo(container!.x, 0);
    expect(content!.width).toBeCloseTo(container!.width, 0);
    const footer = await page.getByRole('contentinfo').boundingBox();
    expect(content!.y + content!.height).toBeLessThanOrEqual(footer!.y);
    await page.screenshot({ path: testInfo.outputPath(`about-${theme}-${width}.png`), fullPage: true });

    const prose = modes.getByRole('link', { name: 'Prose practice', exact: true });
    await prose.focus();
    await page.keyboard.press('Tab');
    const code = modes.getByRole('link', { name: 'Code practice', exact: true });
    await expect(code).toBeFocused();
    await expect(code).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Tab');
    await expect(modes.getByRole('link', { name: 'Multiplayer', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(code).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/game$/);
    await expect(page.getByRole('textbox', { name: 'Type the practice snippet' })).toBeVisible();

    await page.goto('/#/about');
    await modes.getByRole('link', { name: 'Prose practice', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeVisible();
    await page.goto('/#/about');
    await modes.getByRole('link', { name: 'Multiplayer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Join room', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
