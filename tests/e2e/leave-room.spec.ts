import { test, expect, type Page } from '@playwright/test';

async function join(page: Page, room: string, username: string) {
  await page.goto('/#/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Room ID', { exact: true }).fill(room);
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`leave the lobby and rejoin in ${theme} at ${width}px`, async ({ page, browser }, testInfo) => {
    const other = await browser.newContext();
    try {
      const peer = await other.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      const room = `leave-${Date.now()}-${width}`;
      await join(peer, room, 'Lin');
      await join(page, room, 'Ada');
      await expect(peer.getByRole('heading', { name: 'Racers 2' })).toBeVisible();
      await peer.getByRole('button', { name: 'Vote to start' }).click();
      const leave = page.getByRole('button', { name: 'Leave room', exact: true });
      await leave.focus();
      await page.screenshot({ path: testInfo.outputPath('leave-room.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#\/login$/);
      await expect(peer.getByRole('heading', { name: 'Racers 1' })).toBeVisible();
      await expect(peer.getByRole('button', { name: 'Vote to start' })).toBeDisabled();
      expect(await page.evaluate(room => [localStorage.getItem('roomId'), localStorage.getItem(`clumsy-keys:room-session:${room}`), localStorage.getItem(`clumsy-keys:race:${room}`)], room)).toEqual([null, null, null]);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Join a room', exact: true })).toBeVisible();
      await join(page, room, 'Ada');
      await expect(peer.getByRole('heading', { name: 'Racers 2' })).toBeVisible();
      await expect(peer.getByRole('button', { name: 'Vote to start' })).toBeEnabled();
      expect(errors).toEqual([]);
    } finally {
      await other.close();
    }
  });
}
