import { test, expect } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`SEO preserves the original practice UI in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
    await page.goto('/');
    const input = page.getByRole('textbox', { name: 'Type the practice passage' });
    await expect(input).toBeFocused();
    await expect(page.locator('#public-content, .discovery, .public-copy-slot')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Free online typing practice with Clumsy Keys' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Start a typing test/ })).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://clumsykeys.vercel.app/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Test your typing speed/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'reset', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: width === 320 ? 'Github' : 'Contact', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(input).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('original-practice-ui.png'), fullPage: true });
    await page.keyboard.type('x');
    await expect(page.getByRole('button', { name: 'Test Settings', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'reset', exact: true }).click();
    await expect(input).toBeFocused();
    await page.goto('/#/game');
    await expect(page.getByRole('textbox', { name: 'Type the practice snippet' })).toBeFocused();
    await expect(page.locator('#public-content, .discovery')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('SEO only changes document metadata and lists the real homepage', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(response.status()).toBe(200);
  expect(html).toContain('<div id="app"></div>');
  expect(html).not.toMatch(/public-content|discovery:start|<h1|<section/);
  expect(html).toContain('application/ld+json');
  const xml = await request.get('/sitemap.xml');
  expect((await xml.text()).match(/<loc>/g)).toHaveLength(1);
  expect(await xml.text()).not.toContain('#');
  expect(await xml.text()).not.toContain('/app');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://clumsykeys.vercel.app/sitemap.xml');
});
