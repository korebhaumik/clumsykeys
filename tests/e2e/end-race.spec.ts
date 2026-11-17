import { test, expect, type Page } from '@playwright/test';

async function join(page: Page, room: string, username: string) {
  await page.goto('/#/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Room ID', { exact: true }).fill(room);
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
}

async function start(host: Page, peer: Page) {
  await host.getByRole('button', { name: 'Vote to start', exact: true }).click();
  await peer.getByRole('button', { name: 'Vote to start', exact: true }).click();
  await expect(host.getByRole('heading', { name: 'Live race' })).toBeAttached({ timeout: 10000 });
  await expect(peer.getByRole('heading', { name: 'Live race' })).toBeAttached();
}

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`host ends a race and participants leave independently in ${theme} at ${width}px`, async ({ page, browser }, testInfo) => {
    const other = await browser.newContext({ viewport: { width, height: 844 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const peer = await other.newPage();
      peer.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      await peer.addInitScript(value => localStorage.setItem('theme', value), theme);
      const room = `end-${testInfo.project.name}-${theme}-${width}-${Date.now()}`;
      await join(page, room, 'Ada');
      await join(peer, room, 'Lin');
      await expect(page.getByRole('list', { name: 'Racers in the room' }).getByText('Host', { exact: true })).toBeVisible();
      await start(page, peer);
      await expect(peer.getByRole('button', { name: 'End race', exact: true })).toHaveCount(0);
      await expect(peer.getByRole('button', { name: 'Leave race', exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(room => !!localStorage.getItem(`clumsy-keys:race:${room}`), room)).toBe(true);
      const end = page.getByRole('button', { name: 'End race', exact: true });
      const leave = page.getByRole('button', { name: 'Leave race', exact: true });
      const settings = page.getByRole('heading', { name: 'Race Settings', exact: true });
      const summary = page.getByRole('region', { name: 'Race settings preview' });
      const viewRoom = page.getByRole('button', { name: /View room/i });
      const hostBadge = page.locator('.live-race-host');
      await page.evaluate(async () => { await document.fonts.ready; });
      const [labelBox, leaveBox, endBox] = await Promise.all(
        [settings, leave, end].map(locator => locator.boundingBox()),
      );
      expect(leaveBox!.y + leaveBox!.height / 2).toBeCloseTo(labelBox!.y + labelBox!.height / 2, 0);
      expect(endBox!.y).toBeCloseTo(leaveBox!.y, 0);
      expect(leaveBox!.x).toBeGreaterThanOrEqual(labelBox!.x + labelBox!.width);
      expect(endBox!.x + endBox!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 320) {
        const headerBox = await page.locator('main header').first().boundingBox();
        expect(labelBox!.y - (headerBox!.y + headerBox!.height)).toBeLessThan(32);
        await expect(summary).toHaveCount(0);
        await expect(viewRoom).toHaveCount(0);
        await expect(hostBadge).toBeHidden();
        for (const button of [leave, end]) {
          await expect(button.locator('svg')).toBeVisible();
          await expect(button.locator('.race-action-label')).toBeHidden();
        }
        await leave.focus();
        await page.keyboard.press('Tab');
        await expect(end).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('textbox', { name: 'Type the race passage' })).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(end).toBeFocused();
      } else {
        for (const button of [leave, end]) {
          await expect(button.locator('svg')).toBeHidden();
          await expect(button.locator('.race-action-label')).toBeVisible();
        }
        const summaryBox = await summary.boundingBox();
        expect(summaryBox!.y + summaryBox!.height / 2).toBeCloseTo(labelBox!.y + labelBox!.height / 2, 0);
        await expect(summary).toHaveAttribute('tabindex', '-1');
        await expect(hostBadge.getByText('Host', { exact: true })).toBeVisible();
        await expect(hostBadge.getByText('Ada', { exact: true })).toBeVisible();
        const [shortcutBox, hostBox] = await Promise.all([viewRoom.boundingBox(), hostBadge.boundingBox()]);
        expect(hostBox!.x).toBeGreaterThan(shortcutBox!.x + shortcutBox!.width);
        expect(hostBox!.y + hostBox!.height / 2).toBeCloseTo(shortcutBox!.y + shortcutBox!.height / 2, 0);
      }
      await page.getByRole('textbox', { name: 'Type the race passage' }).focus();
      await end.hover();
      await page.screenshot({ path: testInfo.outputPath('live-race-toolbar.png'), animations: 'disabled' });
      await end.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'End this race?' });
      await expect(dialog).toBeVisible();
      const keep = dialog.getByRole('button', { name: 'Keep racing', exact: true });
      const confirm = dialog.getByRole('button', { name: 'End race for everyone', exact: true });
      await expect(keep).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(confirm).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(keep).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath('end-race-dialog.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(end).toBeFocused();
      await expect(peer.getByRole('heading', { name: 'Live race' })).toBeAttached();
      await page.keyboard.press('Enter');
      await keep.click();
      await expect(dialog).not.toBeVisible();
      await expect(end).toBeFocused();
      await page.keyboard.press('Enter');
      await peer.keyboard.press('Alt+r');
      await expect(peer.getByRole('dialog', { name: room, exact: true })).toBeVisible();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      for (const player of [page, peer]) {
        await expect(player.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
        await expect(player.getByRole('dialog')).not.toBeVisible();
        await expect(player.getByRole('button', { name: 'Vote to start', exact: true })).toBeFocused();
        expect(await player.evaluate(room => localStorage.getItem(`clumsy-keys:race:${room}`), room)).toBeNull();
        expect(player.url()).toContain('#/race');
      }
      await start(page, peer);
      await peer.getByRole('button', { name: 'Leave race', exact: true }).click();
      await expect(peer).toHaveURL(/#\/login$/);
      await expect(page.getByRole('heading', { name: 'Live race' })).toBeAttached();
      await expect(page.getByRole('progressbar')).toHaveCount(1);
      await end.click();
      await confirm.click();
      await expect(page.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Vote to start', exact: true })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Leave room', exact: true })).toBeFocused();
      expect(errors).toEqual([]);
    } finally { await other.close(); }
  });
}

test('the next racer gains host controls when the host leaves an active race', async ({ page, browser }) => {
  const other = await browser.newContext();
  try {
    const peer = await other.newPage();
    const room = `host-transfer-${Date.now()}`;
    await join(page, room, 'Ada');
    await join(peer, room, 'Lin');
    await start(page, peer);
    await page.getByRole('button', { name: 'Leave race', exact: true }).click();
    await expect(page).toHaveURL(/#\/login$/);
    await expect(peer.locator('.live-race-host').getByText('Lin', { exact: true })).toBeVisible();
    await peer.getByRole('button', { name: 'End race', exact: true }).click();
    await peer.getByRole('button', { name: 'End race for everyone', exact: true }).click();
    await expect(peer.getByRole('heading', { name: 'Race lobby' })).toBeVisible();
    await expect(peer.getByRole('button', { name: 'Leave room', exact: true })).toBeFocused();
  } finally { await other.close(); }
});
