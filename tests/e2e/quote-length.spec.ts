import { test, expect } from '@playwright/test';
import { quoteCatalog } from '../../shared/content/quote-catalog';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`quote lengths select complete prose in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
    await page.goto('/');
    async function openQuoteSettings() {
      await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Test Type', exact: true }).click();
      await dialog.getByRole('button', { name: 'Quotes', exact: true }).click();
      return dialog;
    }
    const dialog = await openQuoteSettings();
    const modes = await dialog.getByRole('group', { name: 'Test type', exact: true }).getByRole('button').all();
    const boxes = await Promise.all(modes.map(button => button.boundingBox()));
    for (const box of boxes) {
      expect(Math.abs(box!.width - boxes[0]!.width)).toBeLessThan(1);
      expect(box!.y).toBe(boxes[0]!.y);
    }
    const cards = dialog.getByRole('group', { name: 'Quote length' });
    await expect(cards.getByRole('button', { name: 'Short', exact: true })).toHaveAccessibleDescription('Up to 100 characters');
    await expect(cards.getByRole('button', { name: 'Medium', exact: true })).toHaveAccessibleDescription('101–300 characters');
    await expect(cards.getByRole('button', { name: 'Long', exact: true })).toHaveAccessibleDescription('Over 300 characters');
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.screenshot({ path: testInfo.outputPath('quote-length-modal.png'), animations: 'disabled' });
    await expect(dialog.getByRole('group', { name: 'Quote length' }).getByRole('button', { name: 'Medium', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
    for (const length of ['short', 'medium', 'long'] as const) {
      if (width === 320) await openQuoteSettings();
      const group = (width === 320 ? dialog : page).getByRole('group', { name: 'Quote length' });
      const button = group.getByRole('button', { name: new RegExp(`^${length}$`, 'i') });
      await button.focus();
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      if (width === 320) await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
      const actual = (await page.locator('.typing-word').allTextContents()).join(' ');
      const pool = quoteCatalog.filter(quote => quote.category === length);
      const strip = (text: string) => text.split(/\s+/).map(word => word.replace(/[^\p{L}\p{M}\p{N}]/gu, '')).filter(Boolean).join(' ');
      expect(pool.some(quote => strip(quote.text) === actual)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('quote-lengths.png'), animations: 'disabled' });
    await page.reload();
    await openQuoteSettings();
    await expect(dialog.getByRole('group', { name: 'Quote length' }).getByRole('button', { name: 'Long', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Type the practice passage' });
    await input.focus();
    const passage = (await page.locator('.typing-word').allTextContents()).join(' ');
    await page.keyboard.type(passage);
    await expect(page.getByRole('heading', { name: 'Practice results', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Practice again', exact: true }).click();
    await openQuoteSettings();
    await expect(dialog.getByRole('group', { name: 'Quote length' }).getByRole('button', { name: 'Long', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}
