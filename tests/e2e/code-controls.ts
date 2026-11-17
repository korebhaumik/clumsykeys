import { expect, type Page } from '@playwright/test';

/** Use the mobile settings dialog while keeping desktop inline-control coverage. */
export async function codeChoice(page: Page, panel: string, option: string) {
  if (page.viewportSize()!.width > 640) {
    await page.getByRole('button', { name: option, exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Test Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: panel, exact: true }).click();
  await dialog.getByRole('button', { name: option, exact: true }).click();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await expect(dialog).not.toBeVisible();
}
