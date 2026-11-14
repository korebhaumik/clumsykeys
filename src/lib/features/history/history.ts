import { isRecord, type PracticeSummary, type RaceResult } from "../../../../backend/src/persistence.contract";
import { raceLanguages, raceModes } from "../../../../backend/src/race.settings";
import { practiceModes, testLabel, testLanguage } from "../auth/dashboard";

export type HistoryRow = PracticeSummary | RaceResult;
export type SortKey = "wpm" | "raw" | "accuracy" | "deviation" | "created_at";
export type HistoryFilters = { mode: string; language: string; days: number };

export function modeLabel(row: HistoryRow) {
	return "id" in row ? `${practiceModes.find(mode => mode.value === row.mode)?.label ?? row.mode} · ${testLabel(row)}` : "Multiplayer";
}

export function resultKey(row: HistoryRow) {
	return "id" in row ? row.id : row.participant_id;
}

export function selectHistory(rows: HistoryRow[], filters: HistoryFilters, sort: SortKey, ascending: boolean, now = Date.now()) {
	return rows.filter(row => {
		if (filters.days && new Date(row.created_at).getTime() < now - filters.days * 86_400_000) return false;
		if ("id" in row) return (!filters.mode || row.mode === filters.mode) && (!filters.language || row.language === filters.language);
		return !filters.mode && !filters.language;
	}).sort((a, b) => {
		const value = (row: HistoryRow) => sort === "created_at" ? new Date(row.created_at).getTime() : (sort === "raw" || sort === "deviation") ? "id" in row ? row[sort] : 0 : row[sort];
		return (value(a) - value(b)) * (ascending ? 1 : -1) || b.created_at.localeCompare(a.created_at) || resultKey(a).localeCompare(resultKey(b));
	});
}

export function historyCsv(rows: HistoryRow[]) {
	// Neutralize spreadsheet formulas in stored language/mode values as well as escaping CSV syntax.
	const cell = (value: string | number) => `"${String(value).replace(/^[\s=+@-]/, "'$&").replaceAll('"', '""')}"`;
	const records = rows.map(row => "id" in row
		? [row.wpm, row.raw, row.accuracy, row.deviation, row.correct, row.incorrect, row.extra, modeLabel(row), testLanguage(row.language), row.created_at]
		: [row.wpm, "", row.accuracy, "", row.typed_chars, "", "", `Multiplayer · ${row.reason}`, "", row.created_at]);
	return [["WPM", "Raw WPM", "Accuracy (%)", "WPM standard deviation", "Correct / typed (race)", "Incorrect", "Extra", "Mode", "Language", "Date (ISO)"], ...records]
		.map(record => record.map(cell).join(",")).join("\r\n");
}

export type SavedRaceSetting = { label: string; value: string };

export function savedRaceSettings(value: unknown): SavedRaceSetting[] {
	if (!isRecord(value) || !["mode", "language", "duration", "wordCount", "punctuation", "numbers"].some(key => Object.hasOwn(value, key))) return [];
	const mode = typeof value.mode === "string" && Object.hasOwn(raceModes, value.mode) ? value.mode as keyof typeof raceModes : undefined;
	const language = typeof value.language === "string" && Object.hasOwn(raceLanguages, value.language) ? raceLanguages[value.language as keyof typeof raceLanguages] : "Unavailable";
	const limit = (count: unknown, unit: string) => typeof count === "number" && Number.isSafeInteger(count) && count > 0 ? `${count} ${unit}` : "Unavailable";
	const toggle = (enabled: unknown) => typeof enabled === "boolean" ? enabled ? "On" : "Off" : "Unavailable";
	return [
		{ label: "Mode", value: mode ? raceModes[mode] : "Unavailable" },
		{ label: "Language", value: language },
		...(mode === "time" ? [{ label: "Time limit", value: limit(value.duration, "seconds") }]
			: mode === "words" ? [{ label: "Word count", value: limit(value.wordCount, "words") }] : []),
		{ label: "Punctuation", value: toggle(value.punctuation) },
		{ label: "Numbers", value: toggle(value.numbers) },
	];
}
