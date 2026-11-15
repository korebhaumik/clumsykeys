import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`preview caret and accent selection in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/themes');
    const caret = page.locator('.theme-sample .caret-word');
    await expect(caret).toHaveText('rhythm,');
    const pending = caret.locator('.text-zinc-600');
    expect(await pending.evaluate(element => getComputedStyle(element, '::before').width)).toBe('2px');
    await expect(page.locator('.theme-sample .caret-word')).toHaveCount(1);
    const expected = theme === 'classic' ? ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'] : ['rgb(155, 205, 134)', 'rgb(21, 27, 29)'];
    for (const selector of ['.lede', '.theme-sample .text-white', '.theme-sample .text-zinc-600', '.global-footer a']) {
      const colors = await page.locator(selector).first().evaluate(element => {
        const style = getComputedStyle(element, '::selection');
        return [style.backgroundColor, style.color];
      });
      expect(colors).toEqual(expected);
    }
    const selected = await page.locator('.lede').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      return selection.toString();
    });
    expect(selected).toContain('Choose how Clumsy Keys looks');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`selection-${theme}-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
