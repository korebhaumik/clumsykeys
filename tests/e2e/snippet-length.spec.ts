import { test, expect } from '@playwright/test';
import { codeLanguages as languages, codeLanguageChoices as languageChoices, snippetLengths } from '../../shared/content/code-catalog';
import { snippetCatalog } from '../../shared/content/snippet-catalog';

for (const theme of ['dark-forest', 'classic']) for (const width of [320, 1440]) {
  test(`snippet length selects complete code in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); Math.random = () => 0; }, theme);
    await page.goto('/#/game');
    const lengths = page.getByRole('group', { name: 'Snippet length', exact: true });
    const input = page.getByRole('textbox', { name: 'Type the practice snippet', exact: true });
    await expect(lengths.getByRole('button', { name: 'Medium', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Next snippet/ })).toHaveCount(0);

    for (const language of languageChoices) {
      await page.getByRole('combobox', { name: 'Snippet language', exact: true }).click();
      await page.getByRole('option', { name: languages[language], exact: true }).click();
      let previousSize = 0;
      for (const length of snippetLengths) {
        const button = lengths.getByRole('button', { name: new RegExp(`^${length}$`, 'i') });
        // Exercise native keyboard activation as well as pointer selection.
        if (length === 'short') {
          await button.focus();
          await page.keyboard.press('Space');
        } else await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(lengths.locator('[aria-pressed="true"]')).toHaveCount(1);
        await expect(input).toBeFocused();
        const lines = await page.locator('.code-line-text').allTextContents();
        const normalize = (line: string) => line.replace(/\s/g, '');
        const complete = snippetCatalog.find(snippet => snippet.language === language && snippet.length === length && JSON.stringify(snippet.lines.map(normalize)) === JSON.stringify(lines.map(normalize)));
        expect(complete, `${language} ${length} keeps the complete snippet`).toBeDefined();
        const size = complete!.lines.join('\n').length;
        expect(size).toBeGreaterThan(previousSize);
        previousSize = size;
        await page.getByRole('button', { name: 'Reset code practice', exact: true }).click();
        const resetLines = (await page.locator('.code-line-text').allTextContents()).map(normalize);
        const alternatives = snippetCatalog.filter(snippet => snippet.language === language && snippet.length === length);
        expect(alternatives.some(snippet => JSON.stringify(snippet.lines.map(normalize)) === JSON.stringify(resetLines))).toBe(true);
        if (alternatives.length > 1) expect(resetLines).not.toEqual(lines.map(normalize));
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('snippet-lengths.png'), animations: 'disabled' });
    await page.keyboard.type('x');
    await expect(lengths).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset code practice', exact: true }).click();
    await expect(lengths.getByRole('button', { name: 'Long', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Keywords', exact: true }).click();
    await expect(lengths).toHaveCount(0);
    await page.getByRole('button', { name: 'Snippets', exact: true }).click();
    await expect(lengths.getByRole('button', { name: 'Long', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}
