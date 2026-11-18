import { writable, get } from "svelte/store";
import socket from "./socket";
import type { RaceStanding } from "../../../../backend/src/race.scoring";
import { maximumRaceWpm } from "../../../../backend/src/race.settings";

// ----------------- Game State -----------------

export type GameState = "waiting" | "ready" | "playing" | "finished";

export const game = writable("waiting" as GameState);

export function setGameState(state: GameState) {
	game.set(state);
}

const data = "call go seem problem seem as such program any";



export const wordsArr = writable<string[]>(data.split(" "));

export const totalChars = writable<number>(data.split("").length);
export const typedChars = writable<number>(0);
export const enteredChars = writable(0);
export const uncorrectedExtras = writable(0);

// ----------------- Timer -----------------

interface timeDataType {
	time: number;
	finishSeconds?: number;
	correctChars: number;
	rawChars: number;
	incorrectChars: number;
	extraChars: number;
	wpm: number;
	raw: number;
	accuracy: number;
}

export const timeDataArr = writable([
	{
		time: 1,
		correctChars: 0,
		rawChars: 0,
		incorrectChars: 0,
		extraChars: 0,
		wpm: 0,
		raw: 0,
		accuracy: 100,
	},
] as timeDataType[]);

let raceStartedAt: number | null = null;
let totalCorrectChars = 0; // Track total correct characters
let totalIncorrectChars = 0; // Track total incorrect characters

function raceClock() {
	return performance.timeOrigin + performance.now();
}

export function raceMetricsCheckpoint() {
	return {
		raceStartedAt,
		totalCorrectChars,
		totalIncorrectChars,
		samples: get(timeDataArr).slice(-2),
	};
}

export function restoreRaceMetrics(checkpoint: ReturnType<typeof raceMetricsCheckpoint>) {
	raceStartedAt = checkpoint.raceStartedAt;
	totalCorrectChars = checkpoint.totalCorrectChars;
	totalIncorrectChars = checkpoint.totalIncorrectChars;
	timeDataArr.set(checkpoint.samples);
}

export function createTimer(onSample: () => void, timed: boolean) {
	raceStartedAt ??= raceClock();
	let tick = 0;
	return window.setInterval(() => {
		if (timed && ++tick % 4 !== 0) {
			sampleRace("progress");
			return;
		}
		sampleRace();
		onSample();
	}, timed ? 250 : 1000);
}

export function sampleRace(kind: "interval" | "progress" | "finish" = "interval") {
	timeDataArr.update((samples) => {
		const sample = samples.at(-1)!;
		const rawCharsPerMinute = (sample.rawChars / 4) * 60;

		const correctAttempts = totalCorrectChars + sample.correctChars;
		const incorrectAttempts = totalIncorrectChars + sample.incorrectChars + sample.extraChars;

		const elapsedSeconds = raceStartedAt === null ? 0 : (raceClock() - raceStartedAt) / 1000;
		if (kind === "finish") sample.finishSeconds = elapsedSeconds;
		sample.wpm = elapsedSeconds > 0 ? Math.floor((correctAttempts / 4) * 60 / elapsedSeconds) : 0;
		sample.raw = samples.length > 1
			? Math.floor((rawCharsPerMinute + samples[samples.length - 2].raw) / 2)
			: Math.floor(rawCharsPerMinute);

		const totalAttempts = correctAttempts + incorrectAttempts;
		sample.accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

		if (kind === "interval") {
			totalCorrectChars = correctAttempts;
			totalIncorrectChars = incorrectAttempts;
			samples.push({
				time: sample.time + 1,
				correctChars: 0,
				rawChars: 0,
				incorrectChars: 0,
				extraChars: 0,
				wpm: sample.wpm,
				raw: sample.raw,
				accuracy: sample.accuracy,
			});
		}

		socket.emit("timeData", {
			roomId: localStorage.getItem("roomId"),
			userId: localStorage.getItem("userId"),
			typedChars: get(typedChars),
			enteredChars: get(enteredChars),
			uncorrectedExtras: get(uncorrectedExtras),
			wpm: Math.min(sample.wpm, maximumRaceWpm),
			accuracy: sample.accuracy,
		});

		return samples;
	});
}

export function resetTest() {
	typedChars.set(0);
	enteredChars.set(0);
	uncorrectedExtras.set(0);

	raceStartedAt = null;
	totalCorrectChars = 0;
	totalIncorrectChars = 0;

	setGameState("waiting");
	timeDataArr.set([
		{
			time: 1,
			correctChars: 0,
			rawChars: 0,
			incorrectChars: 0,
			extraChars: 0,
			wpm: 0,
			raw: -1,
			accuracy: 100,
		},
	]);
}

export const finalRanking = writable<RaceStanding[]>([]);
