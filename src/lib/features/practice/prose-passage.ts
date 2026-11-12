import { addNumbers, drawQuote, drawWords } from "../../../../backend/src/words/passages";
import type { TestConfig } from "../settings/settings.store";

const punctuationMarks = {
	easy: ',.!?"\':;',
	mid: "@#$%&*",
	hard: "()_-=+[]",
	insane: "~`|{}",
};
const numberIntervals = { easy: 15, mid: 10, hard: 5, insane: 1 };

export function makeProsePassage(config: TestConfig) {
	const count = config.words ?? (config.timer ?? 30) * 5;
	const language = config.language === "english 1k" ? "english-1k"
		: config.language === "english 2k" ? "english-2k"
		: config.language === "english 5k" ? "english-5k"
		: config.language;
	if (config.quotes) {
		const quote = drawQuote(config.punctuations !== null);
		return config.numbers ? addNumbers(quote, Math.min(quote.length, numberIntervals[config.numbers])) : quote;
	}

	let words = drawWords(language, count);
	if (config.numbers) words = addNumbers(words, numberIntervals[config.numbers]).slice(0, count);
	if (config.punctuations) {
		const marks = punctuationMarks[config.punctuations];
		words = words.map((word, index) => index % 4 === 3 || index === words.length - 1
			? word + marks[Math.floor(Math.random() * marks.length)]
			: word);
	}
	return words;
}
