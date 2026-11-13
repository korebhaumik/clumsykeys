import { expect, test } from '@playwright/test';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 768, 1440]) {
  test(`account entry layout and keyboard controls in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.goto('/#/account');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with GitHub', exact: true })).toBeVisible();
    const layout = await page.evaluate(() => {
      const account = document.querySelector('.account-page')!.getBoundingClientRect();
      const container = document.querySelector('.page-shell')!.getBoundingClientRect();
      return { left: account.left, right: account.right, containerLeft: container.left, containerRight: container.right };
    });
    expect(layout.left).toBeCloseTo(layout.containerLeft, 0);
    expect(layout.right).toBeCloseTo(layout.containerRight, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`signin-${theme}-${width}.png`), fullPage: true });

    const email = page.getByLabel('Email', { exact: true });
    await email.focus();
    const emailField = page.locator('.focus-field').filter({ has: email });
    await expect(email).toHaveCSS('outline-style', 'none');
    await expect(emailField).toHaveCSS('outline-style', 'solid');
    await expect(emailField).toHaveCSS('outline-width', '2px');
    await page.screenshot({ path: testInfo.outputPath(`focused-field-${theme}-${width}.png`), fullPage: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(emailField).toHaveCSS('outline-style', 'solid');
    await page.emulateMedia({ forcedColors: 'none' });

    const password = page.getByLabel('Password', { exact: true });
    await password.fill('test-password'); await password.press('Tab');
    await expect(page.getByRole('button', { name: 'Show password', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(password).toHaveAttribute('type', 'text'); await expect(password).toHaveValue('test-password');
    await page.keyboard.press('Enter'); await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByLabel('Display name', { exact: true })).toBeVisible();
    await expect(password).toHaveValue(''); await expect(password).toHaveAttribute('type', 'password');
    await page.screenshot({ path: testInfo.outputPath(`signup-${theme}-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Send reset link', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with GitHub', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const mode of ['signin', 'signup']) {
  test(`GitHub OAuth uses PKCE and restores an account from ${mode}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#/account');
    if (mode === 'signup') await page.getByRole('button', { name: 'Create account', exact: true }).click();
    const authorization = page.waitForRequest(request => request.url().includes('/auth/v1/authorize?'));
    const githubButton = page.getByRole('button', { name: 'Continue with GitHub', exact: true });
    await githubButton.focus();
    await page.keyboard.press('Enter');
    const url = new URL((await authorization).url());
    expect(url.searchParams.get('provider')).toBe('github');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4193/?auth_action=confirm');
    await expect(page.getByRole('heading', { name: 'Your account.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GitHub typist', exact: true })).toBeVisible();
    const profileWidth = await page.locator('.account-page').boundingBox();
    const routeWidth = await page.locator('.route-content').boundingBox();
    expect(profileWidth!.width).toBeCloseTo(routeWidth!.width, 0);
    await expect(page).toHaveURL('http://127.0.0.1:4193/#/account');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'GitHub typist', exact: true })).toBeVisible();
    await page.getByRole('region', { name: 'Your account.', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue with GitHub', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue with GitHub', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a cancelled OAuth callback allows email sign-in and clears its error', async ({ page }) => {
  await page.goto('/?error=access_denied&error_description=Access%20denied&auth_action=confirm');
  await expect(page).toHaveURL('http://127.0.0.1:4193/#/account');
  await expect(page.getByRole('alert')).toContainText("Sign-in wasn't completed");
  await page.getByLabel('Email', { exact: true }).fill('oauth-fallback@test.local');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your account.' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
