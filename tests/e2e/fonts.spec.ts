import { test, expect } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) {
  for (const width of [320, 1440]) {
    test(`loads self-hosted fonts in ${theme} at ${width}px`, async ({ page }) => {
      const googleRequests: string[] = [];
      const errors: string[] = [];
      const fontResponses: { url: string; status: number }[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => {
        if (response.url().includes('.woff2')) fontResponses.push({ url: response.url(), status: response.status() });
      });
      await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
        googleRequests.push(route.request().url());
        return route.abort();
      });
      await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(page.getByRole('textbox', { name: 'Type the practice passage' })).toBeFocused();
      const loaded = await page.evaluate(async () => {
        const faces = await Promise.all([
          document.fonts.load('400 16px Comfortaa', 'Typing café'),
          document.fonts.load('600 16px Comfortaa', 'Typing'),
          document.fonts.load('700 16px Comfortaa', 'Typing'),
          document.fonts.load('400 16px Poppins', 'cleverly clumsy'),
          document.fonts.load('500 16px Poppins', 'clumsykeys'),
        ]);
        await document.fonts.ready;
        return {
          loaded: faces.map(group => group.length > 0 && group.every(face => face.status === 'loaded')),
          brandWeights: [faces[3].map(face => face.weight), faces[4].map(face => face.weight)],
        };
      });
      expect(loaded.loaded).toEqual([true, true, true, true, true]);
      expect(loaded.brandWeights).toEqual([['400'], ['500']]);
      expect(fontResponses.some(response => response.url.includes('comfortaa'))).toBe(true);
      expect(fontResponses.some(response => response.url.includes('poppins'))).toBe(true);
      expect(fontResponses.every(response => new URL(response.url).origin === 'http://127.0.0.1:4193' && response.status === 200)).toBe(true);
      expect(googleRequests).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
