import type { SpeedPoint } from "../../components/charts/result-chart";

type PracticeInput = "correct" | "incorrect" | "extra";

export type PracticeStats = Record<PracticeInput, number> & {
	elapsedSeconds: number;
	wpm: number;
	accuracy: number;
};

type WordTiming = { word: string; milliseconds: number; correctPositions: Set<number>; errors: number };
type WordResult = { word: string; wpm: number | null; errors: number };
type PracticeSample = SpeedPoint & { raw: number; errors: number };

export type PracticeResults = PracticeStats & {
	raw: number;
	deviation: number;
	samples: PracticeSample[];
	history: WordResult[];
};

function wordsPerMinute(characters: number, seconds: number) {
	return seconds > 0 ? Math.floor(characters * 15 / seconds) : 0;
}

export function createPracticeSession() {
	let startedAt: number | undefined;
	const counts = { correct: 0, incorrect: 0, extra: 0 };
	const buckets: (typeof counts)[] = [];
	const wordTimings = new Map<string, WordTiming>();
	let lastInputAt: number | undefined;

	function stats(): PracticeStats {
		const elapsedSeconds = startedAt === undefined ? 0 : (performance.now() - startedAt) / 1000;
		const attempts = counts.correct + counts.incorrect + counts.extra;
		return {
			...counts,
			elapsedSeconds,
			wpm: wordsPerMinute(counts.correct, elapsedSeconds),
			accuracy: attempts > 0 ? Math.round(counts.correct / attempts * 1000) / 10 : 100,
		};
	}

	return {
		record(outcome: PracticeInput, word: string, target: string, position: number) {
			const now = performance.now();
			startedAt ??= now;
			counts[outcome] += 1;
			const second = Math.floor((now - startedAt) / 1000);
			const bucket = buckets[second] ??= { correct: 0, incorrect: 0, extra: 0 };
			bucket[outcome] += 1;
			const timing = wordTimings.get(target) ?? { word, milliseconds: 0, correctPositions: new Set<number>(), errors: 0 };
			// Attribute the gap before an input to its target, including time spent correcting it.
			timing.milliseconds += now - (lastInputAt ?? now);
			lastInputAt = now;
			if (outcome === "correct") timing.correctPositions.add(position);
			else timing.errors += 1;
			wordTimings.set(target, timing);
		},
		stats,
		finish(): PracticeResults {
			const result = stats();
			const raw = wordsPerMinute(counts.correct + counts.incorrect + counts.extra, result.elapsedSeconds);
			const samples: PracticeSample[] = [];
			let correct = 0;
			let attempts = 0;

			for (let index = 0; index < buckets.length; index++) {
				const bucket = buckets[index];
				const errors = (bucket?.incorrect ?? 0) + (bucket?.extra ?? 0);
				correct += bucket?.correct ?? 0;
				attempts += (bucket?.correct ?? 0) + errors;
				const seconds = Math.min(index + 1, result.elapsedSeconds);
				samples.push({ seconds, wpm: wordsPerMinute(correct, seconds), raw: wordsPerMinute(attempts, seconds), errors });
			}

			const mean = samples.reduce((sum, point) => sum + point.wpm, 0) / (samples.length || 1);
			const deviation = Math.sqrt(samples.reduce((sum, point) => sum + (point.wpm - mean) ** 2, 0) / (samples.length || 1));
			const history = Array.from(wordTimings.values(), ({ word, milliseconds, correctPositions, errors }) => ({
				word,
				wpm: milliseconds > 0 ? wordsPerMinute(correctPositions.size, milliseconds / 1000) : null,
				errors,
			}));
			return { ...result, raw, deviation, samples, history };
		},
	};
}
