import { languages } from "../practice/code-snippets";
import { practiceDurations, practiceWordCounts, proseLanguages } from "../practice/practice-options";

import type { LeaderboardFilters, LeaderboardMode, LeaderboardPage, SoloScore, TestFormat } from "../../../../backend/src/leaderboard.contract";
export type { LeaderboardFilters, LeaderboardMode, LeaderboardPage, RankedScore, SoloScore } from "../../../../backend/src/leaderboard.contract";
export const timeRanges = [
	{ value: "all", label: "All time" }, { value: "month", label: "Past 30 days" },
	{ value: "week", label: "Past 7 days" }, { value: "day", label: "Past 24 hours" },
] as const;
export const pageSize = 10;

export function languageOptions(mode: LeaderboardMode) {
	return mode === "prose" ? proseLanguages.map(({ value, label }) => ({ value: String(value), label }))
		: Object.entries(languages).map(([value, label]) => ({ value, label }));
}
export function testOptions(mode: LeaderboardMode): { value: TestFormat; label: string }[] {
	return mode === "prose" ? [{ value: "time", label: "Timed" }, { value: "words", label: "Words" }, { value: "quotes", label: "Quotes (English)" }]
		: [{ value: "snippets", label: "Code snippets" }, { value: "keywords-time", label: "Keywords · timed" }, { value: "keywords-words", label: "Keywords · words" }];
}
export function lengthOptions(test: TestFormat) {
	if (test === "snippets" || test === "quotes") return [{ value: 0, label: test === "snippets" ? "Full snippet" : "Full quote" }];
	const timed = test === "time" || test === "keywords-time";
	return (timed ? practiceDurations : practiceWordCounts).map(value => ({ value: Number(value), label: `${value} ${timed ? "seconds" : "words"}` }));
}

/** Normalize untrusted hash query state, including incompatible mode/format combinations. */
export function parseFilters(query: string): LeaderboardFilters {
	const params = new URLSearchParams(query.replace(/^\?/, ""));
	const mode = params.get("mode") === "dev" ? "dev" : "prose";
	const tests = testOptions(mode);
	const test = tests.find(option => option.value === params.get("test"))?.value ?? tests[0].value;
	const options = languageOptions(mode);
	const language = test === "quotes" ? proseLanguages[0].value
		: options.find(option => option.value === params.get("language"))?.value ?? options[0].value;
	const lengths = lengthOptions(test);
	const length = lengths.find(option => option.value === Number(params.get("length")))?.value
		?? lengths.find(option => option.value === 30)?.value ?? lengths[0].value;
	const range = timeRanges.find(option => option.value === params.get("range"))?.value ?? "all";
	const rawPage = Number(params.get("page"));
	const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 1_000_000) : 1;
	return { mode, language, test, length, range, page };
}
export function filterQuery(filters: LeaderboardFilters) {
	return new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)])).toString();
}
export function updateFilters(filters: LeaderboardFilters, changes: Partial<LeaderboardFilters>) {
	const next = { ...filters, ...changes, page: changes.page ?? 1 };
	if (changes.mode && changes.mode !== filters.mode) {
		next.language = languageOptions(changes.mode)[0].value;
		next.test = testOptions(changes.mode)[0].value;
		next.length = -1;
	} else if (changes.test && changes.test !== filters.test) next.length = -1;
	return parseFilters(filterQuery(next));
}

/** One best result per person in the selected board. Ties: accuracy, earlier date, stable ID. */
export function rankScores(scores: readonly SoloScore[], filters: LeaderboardFilters, userId: string | null, now = Date.now()): LeaderboardPage {
	const days = { all: Infinity, month: 30, week: 7, day: 1 }[filters.range];
	const eligible = scores.filter(score => score.mode === filters.mode && score.language === filters.language &&
		score.test === filters.test && score.length === filters.length && Number.isFinite(score.wpm) && score.wpm >= 0 &&
		Number.isFinite(score.accuracy) && score.accuracy >= 0 && score.accuracy <= 100 &&
		Date.parse(score.date) <= now && Date.parse(score.date) >= now - days * 86_400_000);
	eligible.sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
	const best = new Map<string, SoloScore>();
	for (const score of eligible) if (!best.has(score.userId)) best.set(score.userId, score);
	const ranked = [...best.values()].map((score, index) => ({ ...score, rank: index + 1 }));
	const pages = Math.max(1, Math.ceil(ranked.length / pageSize));
	const page = Math.min(filters.page, pages);
	return { rows: ranked.slice((page - 1) * pageSize, page * pageSize), currentUser: ranked.find(row => row.userId === userId) ?? null, total: ranked.length, page, pages };
}
