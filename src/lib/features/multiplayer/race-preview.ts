const phrases = [
	"Steady hands and a little practice turn small steps into faster, more accurate typing.",
	"Find your rhythm, follow the words, and let each careful keystroke carry you to the finish.",
	"A friendly race is a chance to build good habits, enjoy the challenge, and improve together.",
] as const;
export const racePreviewDuration = 12000;
const adaPace = [[1400, 0], [4200, .40], [6600, .64], [8640, 1]] as const;
const linPace = [[1240, 0], [4200, .47], [4800, .50], [5400, .50], [6600, .60], [9600, 1]] as const;

function progress(time: number, pace: readonly (readonly [number, number])[]) {
	if (time <= pace[0][0]) return 0;
	for (let index = 1; index < pace.length; index++) {
		const [end, value] = pace[index];
		const [start, previous] = pace[index - 1];
		if (time <= end) return previous + (value - previous) * (time - start) / (end - start);
	}
	return 1;
}

/** Scripted keystrokes for a decorative race, independent of real sessions and scores. */
export function racePreviewFrame(elapsed: number) {
	const time = Math.max(0, elapsed);
	const phase = time % racePreviewDuration;
	const phrase = phrases[Math.floor(time / racePreviewDuration) % phrases.length];
	const ada = Math.floor(progress(phase, adaPace) * phrase.length);
	let lin = Math.floor(progress(phase, linPace) * phrase.length);
	const mistake = phase >= 4800 && phase < 5100;
	if (mistake) lin = Math.floor(phrase.length * .5) + 1;
	const opacity = phase < 500 ? phase / 500 : phase > 11000 ? Math.max(0, (11700 - phase) / 700) : 1;
	return { phrase, opacity, players: [{ name: "Ada", count: ada, mistake: false }, { name: "Lin", count: lin, mistake }] };
}
