import { codeChoice } from './code-controls';
import { expect, test } from '@playwright/test';

// Exercise actual animation frames rather than reduced-motion screenshots.
for (const theme of ['dark-forest', 'classic']) test.describe(`mobile typing responsiveness in ${theme}`, () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
  });

  test('caret reaches each typed position by the next frame', async ({ page }) => {
    for (const mode of ['prose', 'snippets', 'keywords']) {
      await page.goto(mode === 'prose' ? '/' : '/#/game');
      // Re-entering the same hash does not reset the previous active snippet.
      await page.reload();
      if (mode === 'keywords') await codeChoice(page, 'Practice Mode', 'Keywords');
      const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
      await prompt.tap(); await prompt.tap();
      const letters = await page.locator('.typing-window .text-zinc-600 > span').allTextContents();
      for (const letter of letters.slice(0, 4)) {
        const error = await page.locator('#boss').evaluate(async (element: HTMLInputElement, letter) => {
          element.value += letter;
          element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letter }));
          await new Promise(requestAnimationFrame);
          const caret = document.querySelector<HTMLElement>('.typing-caret')!;
          const style = getComputedStyle(caret);
          return Math.abs(parseFloat(style.left) - parseFloat(caret.style.left));
        }, letter);
        expect(error).toBeLessThan(1);
      }
    }
  });

  test('browser viewport panning does not trigger corrective page scrolling', async ({ page }) => {
    await page.goto('/#/game');
    const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
    await prompt.tap(); await prompt.tap();
    const corrections = await page.evaluate(async () => {
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, 'offsetTop', { configurable: true, get: () => 300 });
      let calls = 0;
      const original = window.scrollBy;
      window.scrollBy = () => { calls++; };
      for (let n = 0; n < 4; n++) {
        viewport.dispatchEvent(new Event('scroll'));
        await new Promise(requestAnimationFrame);
      }
      window.scrollBy = original;
      return calls;
    });
    expect(corrections).toBe(0);
  });
});
