import { quoteLengths, type QuoteLength } from "../../shared/content/quote-length";
// Browser-safe persistence contract. No transport, environment, or SDK imports.
import type { Database, Json } from "./database.types";
export type { Json } from "./database.types";
export type CodePreferences = {
	mode: "snippets" | "keywords";
	language: "randomPy" | "randomJs" | "randomTs" | "randomJava" | "randomCpp" | "randomC";
	limit: { type: "time" | "words"; value: number };
	modifiers: { numbers: boolean; punctuation: boolean };
};
export type Preferences = {
	version: 1;
	theme: "dark-forest" | "classic";
	prose: {
		punctuations: null | "easy" | "mid" | "hard" | "insane";
		numbers: null | "easy" | "mid" | "hard" | "insane";
		language: "english" | "english 1k" | "english 2k" | "english 5k" | "hinglish";
		timer: number | null; words: number | null; quotes: "Random Quotes" | null; quoteLength?: QuoteLength;
		difficulty: { wpmLimit: number | null; timeLimit: number | null };
	};
	code: CodePreferences;
};
export type PracticeSubmission = {
	id: string;
	mode: "prose" | "code-snippets" | "code-keywords";
	language: string;
	settings: Json;
	stats: {
		correct: number; incorrect: number; extra: number; elapsedSeconds: number;
		wpm: number; raw: number; accuracy: number; deviation: number;
		samples: { seconds: number; wpm: number; raw: number; errors: number }[];
		history: { word: string; wpm: number | null; errors: number }[];
	};
};
export type RaceArchive = {
	id: string; roomId: string; settings: Json; startedAt: string; endedAt: string;
	outcome: "completed" | "aborted";
	results: {
		participantId: string; userId: string; accountId: string | null; username: string;
		wpm: number; accuracy: number; typedChars: number; finishSeconds: number | null;
		reason: "completed" | "time-limit" | "disconnected";
		speedHistory: { seconds: number; wpm: number }[];
	}[];
};
export type PracticeSummary = Database["public"]["Tables"]["practice_results"]["Row"];
export type RaceResult = Database["public"]["Tables"]["race_results"]["Row"];
export type AccountData = { displayName: string; handle: string | null; preferences: Preferences | null; revision: number };
export type AccountDashboard = {
	stats: { tests: number; seconds: number; characters: number; averageWpm: number; averageRaw: number; averageAccuracy: number; bestWpm: number };
	bests: PracticeSummary[];
	recent: PracticeSummary[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
export function isUuid(value: unknown): value is string {
	return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function finite(value: unknown, maximum = 1_000_000): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
}
function count(value: unknown) { return finite(value) && Number.isInteger(value); }
function limit(value: unknown) { return value === null || (finite(value, 86_400) && value > 0); }

export function parsePreferences(value: unknown): Preferences | undefined {
	if (!isRecord(value) || value.version !== 1 || !["classic", "dark-forest"].includes(String(value.theme))) return;
	const { prose: p, code: c } = value;
	if (!isRecord(p) || !isRecord(p.difficulty) || !isRecord(c) || !isRecord(c.limit) || !isRecord(c.modifiers)) return;
	const levels = [null, "easy", "mid", "hard", "insane"];
	if (!levels.includes(p.punctuations as null) || !levels.includes(p.numbers as null) ||
		!["english", "english 1k", "english 2k", "english 5k", "hinglish"].includes(String(p.language)) ||
		(p.quoteLength !== undefined && !quoteLengths.some(length => length === p.quoteLength)) ||
		!limit(p.timer) || !limit(p.words) || ![null, "Random Quotes"].includes(p.quotes as null) ||
		[p.timer !== null, p.words !== null, p.quotes !== null].filter(Boolean).length !== 1 ||
		!limit(p.difficulty.wpmLimit) || !limit(p.difficulty.timeLimit) ||
		!["snippets", "keywords"].includes(String(c.mode)) ||
		!["randomPy", "randomJs", "randomTs", "randomJava", "randomCpp", "randomC"].includes(String(c.language)) ||
		!(c.limit.type === "time" ? [15, 30, 60, 120] : c.limit.type === "words" ? [25, 50, 100, 200] : []).includes(c.limit.value as number) ||
		typeof c.modifiers.numbers !== "boolean" || typeof c.modifiers.punctuation !== "boolean") return;
	// Copy only approved fields, including nested objects.
	return {
		version: 1, theme: value.theme as Preferences["theme"],
		prose: { punctuations: p.punctuations, numbers: p.numbers, language: p.language,
			timer: p.timer, words: p.words, quotes: p.quotes,
			...(p.quoteLength !== undefined ? { quoteLength: p.quoteLength } : {}),
			difficulty: { wpmLimit: p.difficulty.wpmLimit, timeLimit: p.difficulty.timeLimit } } as Preferences["prose"],
		code: { mode: c.mode, language: c.language, limit: { type: c.limit.type, value: c.limit.value },
			modifiers: { numbers: c.modifiers.numbers, punctuation: c.modifiers.punctuation } } as CodePreferences,
	};
}

export function parsePractice(value: unknown): PracticeSubmission | undefined {
	if (!isRecord(value) || !isUuid(value.id) || !["prose", "code-snippets", "code-keywords"].includes(String(value.mode)) ||
		typeof value.language !== "string" || !value.language.length || value.language.length > 40 || !isRecord(value.settings)) return;
	const s = value.stats;
	const defaults: Preferences = { version: 1, theme: "dark-forest",
		prose: { punctuations: null, numbers: null, language: "english 2k", timer: 30, words: null, quotes: null,
			difficulty: { wpmLimit: null, timeLimit: null } },
		code: { mode: "snippets", language: "randomPy", limit: { type: "words", value: 25 }, modifiers: { numbers: false, punctuation: false } } };
	const config = parsePreferences({ ...defaults, [value.mode === "prose" ? "prose" : "code"]: value.settings });
	if (!config || (value.mode === "prose" ? value.language !== config.prose.language
		: value.language !== config.code.language || value.settings.mode !== (value.mode === "code-snippets" ? "snippets" : "keywords") || typeof value.settings.autoTabs !== "boolean")) return;
	if (!isRecord(s) || ![s.correct, s.incorrect, s.extra].every(count) || !finite(s.elapsedSeconds, 86_400) || s.elapsedSeconds <= 0 ||
		!Array.isArray(s.samples) || s.samples.length > 86_400 || !Array.isArray(s.history) || s.history.length > 10_000) return;
	let previous = 0;
	for (const point of s.samples) {
		if (!isRecord(point) || !finite(point.seconds, s.elapsedSeconds) || point.seconds <= previous ||
			![point.wpm, point.raw, point.errors].every(count)) return;
		previous = point.seconds;
	}
	if (!s.history.every(word => isRecord(word) && typeof word.word === "string" && word.word.length <= 1000 &&
		(word.wpm === null || finite(word.wpm)) && count(word.errors))) return;
	const attempts = (s.correct as number) + (s.incorrect as number) + (s.extra as number);
	// Generous ceiling using the existing four-character WPM formula. This rejects
	// impossible summaries, but client counters still cannot establish honest typing.
	if (!attempts || !finite(attempts * 15 / s.elapsedSeconds, 1500)) return;
	const samples = (s.samples as PracticeSubmission["stats"]["samples"]).map(({ seconds, wpm, raw, errors }) => ({ seconds, wpm, raw, errors }));
	const mean = samples.reduce((sum, point) => sum + point.wpm, 0) / (samples.length || 1);
	return {
		id: value.id, mode: value.mode as PracticeSubmission["mode"], language: value.language,
		settings: value.mode === "prose" ? config.prose : { ...config.code, autoTabs: value.settings.autoTabs as boolean },
		stats: { correct: s.correct as number, incorrect: s.incorrect as number, extra: s.extra as number,
			elapsedSeconds: s.elapsedSeconds,
			wpm: Math.floor((s.correct as number) * 15 / s.elapsedSeconds), raw: Math.floor(attempts * 15 / s.elapsedSeconds),
			accuracy: Math.round((s.correct as number) / attempts * 1000) / 10,
			deviation: Math.sqrt(samples.reduce((sum, point) => sum + (point.wpm - mean) ** 2, 0) / (samples.length || 1)),
			samples, history: (s.history as PracticeSubmission["stats"]["history"]).map(({ word, wpm, errors }) => ({ word, wpm, errors })) },
	};
}

/** Handles are public identifiers, distinct from editable display names and room aliases. */
export function parseHandle(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const handle = value.trim().toLowerCase();
	return /^[a-z0-9_]{3,24}$/.test(handle) ? handle : null;
}
