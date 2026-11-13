import { languageOptions, lengthOptions, rankScores, testOptions, type LeaderboardFilters, type LeaderboardPage, type SoloScore } from "../../src/lib/features/leaderboards/leaderboard";

export interface LeaderboardService {
	readonly isDemo: boolean;
	read(filters: LeaderboardFilters, userId: string | null, signal: AbortSignal): Promise<LeaderboardPage>;
}
export const previewUserId = "solo-preview-player";
const names = ["sage", "semicolon", "quietkeys", "juniper", "bytebloom", "softshift", "fern", "syntax", "moss", "paperplane", "orbit", "keylime", "maple", "tinytype", "echo", "loop", "cedar", "preview player", "aster", "tabby", "clover", "north", "pixel", "willow", "ripple", "indigo", "comet", "dawn", "lumen", "sprout", "atlas", "hush", "olive", "quill"];

/** Synthetic solo results only. Never read or publish private account history. */
function demoScores(filters: LeaderboardFilters, now: number): SoloScore[] {
	return names.map((username, index) => {
		const wpm = 142 - index * 2 + (filters.mode === "dev" ? -18 : 0);
		const seconds = filters.test.endsWith("time") ? filters.length : 30;
		const correct = wpm * seconds / 15, incorrect = index % 7, extra = index % 3;
		return {
			id: `sample-${filters.mode}-${filters.language}-${filters.test}-${filters.length}-${index}`,
			userId: index === 17 ? previewUserId : `sample-player-${index}`, username,
			mode: filters.mode, language: filters.language, test: filters.test, length: filters.length,
			wpm, raw: Math.floor((correct + incorrect + extra) * 15 / seconds),
			accuracy: Math.round(correct / (correct + incorrect + extra) * 1000) / 10,
			deviation: Math.round((2.5 + index % 5 * 1.3) * 10) / 10, correct, incorrect, extra,
			date: new Date(now - (index % 20) * 86_400_000 - 3_600_000).toISOString(),
		};
	});
}

/** Replace this adapter with a public solo leaderboard endpoint when one exists. */
export const leaderboardService: LeaderboardService = {
	isDemo: true,
	async read(filters, userId, signal) {
		await new Promise<void>((resolve, reject) => {
			if (signal.aborted) { reject(signal.reason); return; }
			const abort = () => { clearTimeout(timer); reject(signal.reason); };
			const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 220);
			signal.addEventListener("abort", abort, { once: true });
		});
		const now = Date.now();
		// Validate catalog membership at the adapter boundary as a real endpoint would.
		if (!languageOptions(filters.mode).some(option => option.value === filters.language) ||
			!testOptions(filters.mode).some(option => option.value === filters.test) ||
			!lengthOptions(filters.test).some(option => option.value === filters.length)) throw new Error("This solo leaderboard is unavailable. Choose another test and retry.");
		return rankScores(demoScores(filters, now), filters, userId, now);
	},
};
