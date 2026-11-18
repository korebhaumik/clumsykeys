import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`saved multiplayer charts retain theme colors in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => {
      localStorage.setItem('theme', theme);
      const windowErrors: string[] = [];
      Object.assign(window, { savedRaceChartErrors: windowErrors });
      window.addEventListener('error', event => windowErrors.push(event.message));
    }, theme);
    await page.goto('/#/account');
    await page.getByLabel('Email', { exact: true }).fill(`race-chart-${randomUUID()}@test.local`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in to account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your account.', exact: true })).toBeVisible();
    // Model an archived race; this test verifies rendering, not race persistence.
    const roundId = randomUUID();
    const racers = ['Ada', 'Grace', 'Lin', 'Sam', 'Jo', 'Alex'].map((username, index) => ({
      racer_id: `racer-${index}`, participant_id: `participant-${index}`, round_id: roundId, username,
      wpm: 75 - index * 5, accuracy: 98, typed_chars: 100, reason: 'completed', created_at: new Date().toISOString(),
      place: index + 1, score: (75 - index * 5) * 0.98,
      finish_seconds: 10 + index * 2, speed_history: [{ seconds: 1, wpm: 0 }, { seconds: 5, wpm: 60 + index * 3 }, { seconds: 10 + index * 2, wpm: 75 - index * 5 }],
    }));
    const mode = theme === 'dark-forest' ? width === 320 ? 'time' : 'words' : width === 320 ? 'quotes' : 'passage';
    const settings = { mode, language: 'english-2k', duration: 60, wordCount: 100, punctuation: false, numbers: true, errorThreshold: 12,
      ...(mode === 'quotes' ? { quoteLength: 'short' } : {}) };
    const archive = { round: { id: roundId, room_id: 'saved-race', settings: settings as Record<string, unknown> | undefined }, ownRacerId: racers[0].racer_id, results: racers };
    await page.route('**/api/history?**', route => route.fulfill({ json: { results: new URL(route.request().url()).searchParams.get('kind') === 'race' ? [racers[0]] : [], nextOffset: null } }));
    await page.route('**/api/race-results/*', route => route.fulfill({ json: archive }));
    await page.goto('/#/history');
    await page.getByRole('button', { name: 'Race history', exact: true }).click();
    const opener = page.getByRole('button', { name: /^View Multiplayer result/ });
    await opener.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Race · saved-race' })).toBeFocused();
    const chart = page.getByRole('figure', { name: 'Race speed by player over time' });
    const dark = theme === 'dark-forest';
    const plot = dark ? 'rgb(17, 23, 25)' : 'rgb(233, 236, 238)';
    const label = dark ? 'rgb(161, 167, 166)' : 'rgb(86, 92, 98)';
    const colors = dark ? ['rgb(155, 205, 134)', 'rgb(119, 170, 245)', 'rgb(220, 146, 93)', 'rgb(177, 155, 234)', 'rgb(235, 139, 158)', 'rgb(90, 197, 195)']
      : ['rgb(0, 0, 0)', 'rgb(37, 93, 167)', 'rgb(153, 71, 23)', 'rgb(105, 72, 170)', 'rgb(162, 55, 92)', 'rgb(23, 109, 104)'];
    async function checkChart() {
      await expect(chart.locator('svg > rect').first()).toHaveCSS('fill', plot);
      await expect(chart.locator('svg text').first()).toHaveCSS('fill', label);
      await expect(chart.locator('path[data-series]')).toHaveCount(6);
      await expect(chart.locator('[data-finish]')).toHaveCount(6);
      for (let index = 0; index < racers.length; index++) {
        await expect(chart.locator(`[data-series="${racers[index].username}"]`)).toHaveCSS('stroke', colors[index]);
        await expect(chart.locator(`[data-finish="${racers[index].username}"]`)).toHaveCSS('stroke', colors[index]);
        await expect(chart.locator('figcaption i').nth(index)).toHaveCSS('color', colors[index]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await checkChart();
    const configuration = page.getByRole('region', { name: 'Race settings', exact: true });
    await expect(configuration.getByRole('heading')).toHaveCount(0);
    await expect(configuration.getByText('Saved with this round', { exact: true })).toHaveCount(0);
    const field = (label: string) => configuration.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
    await expect(field('Mode')).toHaveText(({ time: 'Time', words: 'Words', quotes: 'Quotes', passage: 'Passage' })[mode]);
    await expect(field('Language')).toHaveText(mode === 'quotes' ? 'English' : 'English 2k');
    await expect(field('Punctuation')).toHaveText('Off');
    await expect(field('Numbers')).toHaveText('On');
    await expect(configuration.locator('input, button, select')).toHaveCount(0);
    if (mode === 'time') {
      await expect(field('Time limit')).toHaveText('60 seconds');
      await expect(field('Word count')).toHaveCount(0);
      await expect(field('Error threshold')).toHaveText('12%');
    } else if (mode === 'words') {
      await expect(field('Word count')).toHaveText('100 words');
      await expect(field('Time limit')).toHaveCount(0);
    } else if (mode === 'quotes') {
      await expect(field('Quote length')).toHaveText('Short');
    } else await expect(configuration.locator('dl > div')).toHaveCount(5);
    if (mode !== 'time') await expect(field('Error threshold')).toHaveText('12%');
    await page.screenshot({ path: testInfo.outputPath(`saved-race-settings-${theme}-${width}.png`), fullPage: true });
    await chart.screenshot({ path: testInfo.outputPath(`saved-race-chart-${theme}-${width}.png`) });
    await page.getByRole('button', { name: 'Back to history' }).click();
    await expect(opener).toBeFocused();
    archive.round.settings = undefined;
    await opener.click();
    await expect(configuration).toContainText('Settings unavailable for this saved race.');
    await expect(configuration.locator('dl')).toHaveCount(0);
    await checkChart();
    await page.goto('/#/ranking');
    await expect(page.getByRole('heading', { name: 'Race results', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your result' }).getByText('73.50', { exact: true })).toBeVisible();
    await checkChart();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => (window as typeof window & { savedRaceChartErrors: string[] }).savedRaceChartErrors)).toEqual([]);
  });
}
