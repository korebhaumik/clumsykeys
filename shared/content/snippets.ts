import { snippetCatalog } from "./snippet-catalog";
import type { CodeLanguage, SnippetLength } from "./code-catalog";
import { randomIndex, type RandomIndex } from "./sampling";

/** Restarts draw within the selected authored category, excluding the last item when possible. */
export function drawSnippet(language: CodeLanguage, length: SnippetLength, previousId?: string, pick: RandomIndex = randomIndex) {
	const matches = snippetCatalog.filter(snippet => snippet.language === language && snippet.length === length);
	const alternatives = matches.filter(snippet => snippet.id !== previousId);
	const choices = alternatives.length ? alternatives : matches;
	if (!choices.length) throw new Error(`No snippets for ${language}/${length}`);
	return choices[pick(choices.length)];
}
