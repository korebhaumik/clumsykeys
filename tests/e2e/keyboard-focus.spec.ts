import { test, expect, type Locator } from '@playwright/test';

async function expectHighlight(control: Locator, theme: string) {
  await expect(control).toBeFocused();
  expect(await control.evaluate(element => element.matches(':focus-visible'))).toBe(true);
  const inverted = await control.evaluate(element => !!element.closest('.config-options, .code-options, .mode-toggle, .snippet-selector'));
  await expect(control).toHaveCSS('outline-style', 'solid');
  await expect(control).toHaveCSS('outline-width', '2px');
  await expect(control).toHaveCSS('outline-offset', '3px');
  await expect(control).toHaveCSS('outline-color', theme === 'classic'
    ? inverted ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'
    : 'rgb(155, 205, 134)');
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`custom keyboard highlights across routes in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Audit every visible control, including the header/footer outside engine-page.
    // Establish keyboard modality before moving focus to each control.
    for (const route of ['/', '/game', '/themes', '/about', '/login', '/leaderboard']) {
      await page.goto('/#' + route);
      await expect(page.locator('main')).toBeVisible();
      await page.keyboard.press('Shift+Tab');
      const controls = page.locator(':is(a[href], button, input, select, textarea, [tabindex="0"]):not([tabindex="-1"])');
      for (const control of await controls.all()) {
        if (!(await control.isVisible()) || !(await control.isEnabled()) || await control.getAttribute('tabindex') === '-1') continue;
        // An authored radius must survive focus; square controls get the fallback.
        await control.evaluate(element => (element as HTMLElement).blur());
        const corners = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
        const radii = await control.evaluate((element, corners) => {
          const style = getComputedStyle(element);
          return corners.map(corner => style.getPropertyValue(corner));
        }, corners);
        await control.focus();
        if (await control.evaluate(element => element.classList.contains('sr-only'))) {
          await expect(control).toHaveCSS('outline-style', 'none');
          await expect(page.locator('.typing-frame')).toHaveCSS('outline-style', 'none');
          if (route === '/game') await expect(page.locator('.code-scroll')).toHaveCSS('outline-style', 'none');
        } else {
          await expectHighlight(control, theme);
          for (const [index, corner] of corners.entries()) {
            await expect(control).toHaveCSS(corner, radii[index] === '0px' ? '4.8px' : radii[index]);
          }
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }

    await page.goto('/');
    const input = page.getByRole('textbox', { name: 'Type the practice passage' });
    await expect(input).toBeFocused();
    await page.keyboard.press('Tab');
    const reset = page.getByRole('button', { name: 'reset', exact: true });
    await expectHighlight(reset, theme);
    await page.keyboard.press('Tab');
    await expectHighlight(page.getByRole('link', { name: 'Contact', exact: true }), theme);
    await page.keyboard.press('Shift+Tab');
    await expect(reset).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS('outline-style', 'none');
    await expect(page.locator('.typing-frame')).toHaveCSS('outline-style', 'none');

    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog');
    await page.keyboard.press('Tab');
    await expectHighlight(dialog.getByRole('button', { name: 'Close settings' }), theme);
    await page.keyboard.press('Tab');
    await expectHighlight(dialog.getByRole('button', { name: 'Language', exact: true }), theme);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expectHighlight(dialog.getByRole('button', { name: 'English', exact: true }), theme);
    await page.screenshot({ path: testInfo.outputPath('keyboard-settings.png') });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(input).toBeFocused();

    if (width === 320) {
      const menu = page.getByRole('button', { name: 'Open navigation' });
      await menu.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await expectHighlight(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link').first(), theme);
      await page.keyboard.press('Escape');
      await expectHighlight(menu, theme);
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else {
      const words = page.locator('.config-options').getByRole('button', { name: /words$/i });
      await words.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expectHighlight(words, theme);
      await page.screenshot({ path: testInfo.outputPath('keyboard-toolbar.png') });
      // Clicking an already keyboard-focused control can retain :focus-visible
      // in Chrome. Check a fresh pointer focus instead.
      await page.getByRole('button', { name: 'time', exact: true }).click();
      await words.click();
      expect(await words.evaluate(element => element.matches(':focus-visible'))).toBe(false);
    }

    await page.goto('/#/game');
    await page.keyboard.press('Shift+Tab');
    await expectHighlight(page.locator(':focus'), theme);
    await page.getByRole('button', { name: 'Keywords', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Type the practice keywords' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expectHighlight(page.getByRole('button', { name: 'Reset code practice' }), theme);
    await expect(page.locator('.code-scroll')).toHaveCSS('outline-style', 'none');

    await page.goto('/#/login');
    await page.getByLabel('Username', { exact: true }).focus();
    await page.keyboard.type('Keyboard tester');
    await page.keyboard.press('Tab');
    await expectHighlight(page.getByLabel('Room ID', { exact: true }), theme);
    await page.keyboard.type(`focus-${theme}-${width}-${Date.now()}`);
    await page.keyboard.press('Tab');
    await expectHighlight(page.getByRole('button', { name: 'Join room', exact: true }), theme);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Test type', exact: true })).toBeEnabled();
    for (const control of await page.locator('.lobby-settings select, .lobby-settings input').all()) {
      await control.focus();
      await expectHighlight(control, theme);
    }
    await page.keyboard.press('Alt+r');
    await expectHighlight(page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }), theme);
    await page.keyboard.press('Escape');

    await page.emulateMedia({ forcedColors: 'active' });
    await expect(page.locator(':focus')).toHaveCSS('outline-style', 'solid');
    await expect(page.locator(':focus')).toHaveCSS('outline-width', '2px');
    expect(errors).toEqual([]);
  });
}
