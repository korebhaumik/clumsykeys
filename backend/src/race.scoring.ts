type RaceMetrics = {
	wpm: number;
	accuracy: number;
	finishSeconds: number | null;
	reason: "completed" | "time-limit" | "error-limit" | "disconnected";
};

type RacePlacement = { score: number | null; place: number | null };

export type RaceStanding = RaceMetrics & RacePlacement & {
	userId: string;
	username: string;
	speedHistory: { seconds: number; wpm: number }[];
};

export function rankRaceResults<T extends RaceMetrics>(racers: T[], completed: boolean): (T & RacePlacement)[] {
	const results = racers.map(racer => ({
		...racer,
		score: completed && (racer.reason === "completed" || racer.reason === "time-limit")
			? Math.round(racer.wpm * racer.accuracy) / 100 : null,
		place: null as number | null,
	}));
	const compare = (a: typeof results[number], b: typeof results[number]) =>
		(b.score ?? -1) - (a.score ?? -1) || b.accuracy - a.accuracy ||
		(a.finishSeconds ?? Number.MAX_VALUE) - (b.finishSeconds ?? Number.MAX_VALUE);
	results.sort(compare);
	for (const [index, racer] of results.entries()) {
		if (racer.score === null) break;
		racer.place = index > 0 && !compare(results[index - 1], racer) ? results[index - 1].place : index + 1;
	}
	return results;
}
