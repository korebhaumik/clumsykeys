export const raceModes = {
	passage: "Passage",
	time: "Time",
	words: "Words",
	quotes: "Quotes",
};

export const raceLanguages = {
	english: "English",
	"english-1k": "English 1k",
	"english-2k": "English 2k",
	"english-5k": "English 5k",
	hinglish: "Hinglish",
};

export const raceDurations: readonly number[] = [15, 30, 60, 120];
export const raceWordCounts: readonly number[] = [25, 50, 100, 200];

export type RaceSettings = {
	mode: keyof typeof raceModes;
	language: keyof typeof raceLanguages;
	duration: number;
	wordCount: number;
	punctuation: boolean;
	numbers: boolean;
};

export const defaultRaceSettings: RaceSettings = {
	mode: "passage",
	language: "english",
	duration: 30,
	wordCount: 25,
	punctuation: true,
	numbers: false,
};

export function applyRaceSettings(settings: RaceSettings, patch: unknown): RaceSettings | undefined {
	if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
	const keys = Object.keys(patch) as (keyof RaceSettings)[];
	if (!keys.every((key) => Object.hasOwn(settings, key))) return;

	const next = { ...settings, ...patch };
	if (typeof next.mode !== "string" || !Object.hasOwn(raceModes, next.mode) ||
		typeof next.language !== "string" || !Object.hasOwn(raceLanguages, next.language) ||
		!raceDurations.includes(next.duration) || !raceWordCounts.includes(next.wordCount) ||
		typeof next.punctuation !== "boolean" || typeof next.numbers !== "boolean") return;

	if (keys.some((key) => settings[key] !== next[key])) return next;
}
