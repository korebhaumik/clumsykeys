import { practiceDurations, practiceWordCounts } from "./practice-options";
import { codeLanguages as languages } from "../../../../shared/content/code-catalog";
import type { CodePreferences } from "../../../../backend/src/persistence.contract";
import { writable } from "svelte/store";

export const codePreferencesKey = "clumsy-keys:code-preferences";

function readCodePreferences(): CodePreferences {
	let saved: Partial<CodePreferences> | null;
	try {
		saved = JSON.parse(sessionStorage.getItem(codePreferencesKey) ?? "null");
	} catch {
		saved = null;
	}
	const limit = saved?.limit;
	return {
		mode: saved?.mode === "keywords" ? "keywords" : "snippets",
		language: saved?.language && Object.hasOwn(languages, saved.language) ? saved.language : "randomPy",
		limit: limit && ((limit.type === "time" && practiceDurations.some(value => value === limit.value)) ||
			(limit.type === "words" && practiceWordCounts.some(value => value === limit.value))) ? limit : { type: "words", value: 25 },
		modifiers: { numbers: saved?.modifiers?.numbers === true, punctuation: saved?.modifiers?.punctuation === true },
	};
}

export const codePreferences = writable(readCodePreferences());
