import { randomInt } from "node:crypto";
import type { RaceSettings } from "./race.settings";
import { addNumbers, drawQuote, drawWords } from "./words/passages";

export function makeRacePassage(settings: RaceSettings) {
	if (settings.mode === "quotes") {
		const words = drawQuote(settings.punctuation, randomInt);
		return (settings.numbers ? addNumbers(words, Math.min(8, words.length), randomInt) : words).join(" ");
	}

	const count = settings.mode === "time" ? settings.duration * 5
		: settings.mode === "words" ? settings.wordCount
		: 9;
	const words = drawWords(settings.language, count, randomInt);
	return words.map((word, index) => {
		const token = settings.numbers && index % 8 === 2 ? String(randomInt(10, 100)) : word;
		if (!settings.punctuation) return token;
		if (index === count - 1) return token + ".";
		return index % 8 === 7 ? token + "," : token;
	}).join(" ");
}
