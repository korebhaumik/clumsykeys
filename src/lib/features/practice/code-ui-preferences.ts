import { snippetLengths, type SnippetLength } from '../../../../shared/content/code-catalog';

const storageKey = 'clumsy-keys:code-ui:v1';
export type CodeUiPreferences = { snippetLength: SnippetLength; autoTabs: boolean };
export function readCodeUiPreferences(): CodeUiPreferences {
	const defaults: CodeUiPreferences = { snippetLength: 'medium', autoTabs: true };
	try {
		const raw = localStorage.getItem(storageKey);
		const saved = raw && raw.length <= 512 ? JSON.parse(raw) : null;
		if (saved?.version !== 1) return defaults;
		return { snippetLength: snippetLengths.find(length => length === saved.snippetLength) ?? defaults.snippetLength,
			autoTabs: typeof saved.autoTabs === 'boolean' ? saved.autoTabs : defaults.autoTabs };
	} catch { return defaults; }
}
export function cacheCodeUiPreferences(value: CodeUiPreferences) {
	try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...value })); } catch { /* Optional device-local settings. */ }
}
