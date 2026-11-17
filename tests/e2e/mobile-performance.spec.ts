import { codeChoice } from './code-controls';
import { expect, test } from '@playwright/test';

// Exercise actual animation frames rather than reduced-motion screenshots.
for (const theme of ['dark-forest', 'classic']) test.describe(`mobile typing responsiveness in ${theme}`, () => {
  let errors: string[] = [];
  test.afterEach(() => { expect(errors).toEqual([]); });
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
  });

  test('caret layout target updates by the next frame', async ({ page }) => {
    for (const mode of ['prose', 'snippets', 'keywords']) {
      await page.goto(mode === 'prose' ? '/' : '/#/game');
      await page.getByRole('textbox', { name: mode === 'prose' ? 'Type the practice passage' : 'Type the practice snippet', exact: true }).waitFor({ state: 'attached' });
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

  test('touch caret smoothly retargets without queuing and honors reduced motion', async ({ page }) => {
    for (const mode of ['prose', 'snippets', 'keywords']) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(mode === 'prose' ? '/' : '/#/game');
      await page.getByRole('textbox', { name: mode === 'prose' ? 'Type the practice passage' : 'Type the practice snippet', exact: true }).waitFor({ state: 'attached' });
      await page.reload();
      if (mode === 'keywords') await codeChoice(page, 'Practice Mode', 'Keywords');
      const prompt = page.getByRole('button', { name: 'Double tap here to start playing', exact: true });
      await prompt.tap(); await prompt.tap();
      const letters = await page.locator('.typing-window .text-zinc-600 > span').allTextContents();
      await page.locator('#boss').evaluate((input: HTMLInputElement, letter) => {
        input.value += letter; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letter }));
      }, letters[0]);
      await expect(page.getByRole('group', { name: 'Live test stats' })).toBeVisible();
      const motion = await page.locator('#boss').evaluate(async (input: HTMLInputElement, letters) => {
        await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        const caret = document.querySelector<HTMLElement>('.typing-caret')!;
        caret.getAnimations().forEach(animation => animation.finish());
        const enter = (letter: string) => { input.value += letter; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letter })); };
        enter(letters[1]);
        const first = caret.getAnimations()[0];
        if (!first) return null;
        first.pause(); first.currentTime = 25;
        const before = caret.getBoundingClientRect().left;
        const target = caret.parentElement!.getBoundingClientRect().left + parseFloat(caret.style.left);
        enter(letters[2]);
        const active = caret.getAnimations();
        active[0].pause(); active[0].currentTime = 0;
        const after = caret.getBoundingClientRect().left;
        const properties = (active[0].effect as KeyframeEffect).getKeyframes().flatMap(frame => Object.keys(frame));
        const duration = active[0].effect!.getComputedTiming().duration;
        active[0].finish();
        return { continuity: Math.abs(after - before), moving: Math.abs(before - target), count: active.length, duration, properties };
      }, letters);
      expect(motion).not.toBeNull();
      expect(motion!.continuity).toBeLessThan(1);
      expect(motion!.moving).toBeGreaterThan(0.1);
      expect(motion!.count).toBe(1);
      expect(motion!.duration).toBe(50);
      expect(motion!.properties).toContain('transform');
      expect(motion!.properties).not.toContain('left');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#boss').evaluate((input: HTMLInputElement, letter) => {
        input.value += letter; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letter }));
      }, letters[3]);
      expect(await page.locator('.typing-caret').evaluate(element => element.getAnimations().length)).toBe(0);
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
