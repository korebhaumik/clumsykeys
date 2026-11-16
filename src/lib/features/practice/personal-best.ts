import { codeLanguages } from "../../../../shared/content/code-catalog";
import { parsePracticeCategory, practiceCategoryKey, type PracticeCategory } from "../../../../backend/src/practice-category.contract";

export type PersonalBests = Record<string, number>;
export type PersonalBest = { category: PracticeCategory; wpm: number; previous: number };
export const personalBestsKey = "clumsy-keys:guest-personal-bests";

export function parsePersonalBests(value: unknown): PersonalBests {
	if (!value || typeof value !== "object" || !("version" in value) || value.version !== 2 || !("bests" in value) || !value.bests || typeof value.bests !== "object") return {};
	const bests: PersonalBests = {};
	for (const [key, wpm] of Object.entries(value.bests)) {
		try {
			const [mode, language, test, length] = JSON.parse(key);
			const category = parsePracticeCategory({ mode, language, test, length });
			if (category && key === practiceCategoryKey(category) && typeof wpm === "number" && Number.isFinite(wpm) && wpm >= 0) bests[key] = wpm;
		} catch { /* Ignore malformed category keys; legacy per-mode bests cannot be attributed. */ }
	}
	return bests;
}

/** The first completed test in a category establishes its baseline; ties do not win. */
export function recordPersonalBest(bests: PersonalBests, category: PracticeCategory, wpm: number): PersonalBest | undefined {
	if (!Number.isFinite(wpm) || wpm < 0) return;
	const key = practiceCategoryKey(category);
	const previous = bests[key];
	if (previous !== undefined && wpm <= previous) return;
	bests[key] = wpm;
	return previous === undefined ? undefined : { category, wpm, previous };
}

export function personalBestCategoryLabel(category: PracticeCategory) {
	const language = codeLanguages[category.language as keyof typeof codeLanguages] ?? category.language.replace(/^./, letter => letter.toUpperCase());
	const format = category.test === "time" ? `${category.length}s`
		: category.test === "words" ? `${category.length} ${category.mode === "code-keywords" ? "keywords" : "words"}`
		: `${String(category.length).replace(/^./, letter => letter.toUpperCase())} ${category.test}`;
	return `${language} · ${format}${category.mode === "code-keywords" && category.test === "time" ? " keywords" : ""}`;
}
