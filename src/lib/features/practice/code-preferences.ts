import { raceDurations, raceWordCounts } from "../../../../backend/src/race.settings";
import { languages } from "./code-snippets";
import type { KeywordLimit, KeywordModifiers } from "./code-keywords";

type CodePreferences = {
	mode: "snippets" | "keywords";
	language: keyof typeof languages;
	limit: KeywordLimit;
	modifiers: KeywordModifiers;
};

export const codePreferencesKey = "clumsy-keys:code-preferences";

export function readCodePreferences(): CodePreferences {
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
		limit: limit && ((limit.type === "time" && raceDurations.includes(limit.value)) ||
			(limit.type === "words" && raceWordCounts.includes(limit.value))) ? limit : { type: "words", value: 25 },
		modifiers: { numbers: saved?.modifiers?.numbers === true, punctuation: saved?.modifiers?.punctuation === true },
	};
}
