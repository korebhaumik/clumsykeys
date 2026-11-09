import { randomInt } from "node:crypto";
import type { RaceSettings } from "./race.settings";
import english from "./words/english.json";
import english5k from "./words/english_5k.json";
import hinglish from "./words/hinglish.json";

export const standardPassage = "The quick brown fox jumps over the lazy dog.";

const extendedEnglish = english5k.words.filter((word) => /^[a-z]+$/i.test(word));
const wordLists = {
	english: english.words,
	"english-2k": extendedEnglish.slice(0, 2000),
	"english-5k": extendedEnglish,
	hinglish: hinglish.words,
};

const englishQuotes = [
	"Brevity is the soul of wit.",
	"The only thing we have to fear is fear itself.",
	"To err is human, to forgive divine.",
];
const hinglishQuotes = [
	"Har din thodi si practice karo, aur dheere dheere raftaar badhao.",
	"Nayi cheez seekhne ke liye pehla kadam uthao.",
];

export function makeRacePassage(settings: RaceSettings) {
	let words: string[];
	if (settings.mode === "quotes") {
		const quotes = settings.language === "hinglish" ? hinglishQuotes : englishQuotes;
		words = quotes[randomInt(quotes.length)].split(" ");
	} else if (settings.mode === "passage" && settings.language === "english") {
		words = standardPassage.split(" ");
	} else {
		const list = wordLists[settings.language];
		const count = settings.mode === "time" ? settings.duration * 5
			: settings.mode === "words" ? settings.wordCount
			: 9;
		words = Array.from({ length: count }, (_, index) => {
			const word = list[randomInt(list.length)];
			if (!settings.punctuation) return word;
			if (index === count - 1) return word + ".";
			return index % 8 === 7 ? word + "," : word;
		});
	}

	if (!settings.punctuation) words = words.map((word) => word.replace(/[^a-z]/gi, ""));
	if (settings.numbers) {
		// Replace words so the word-count mode still has the requested length.
		words = words.map((word, index) => index % 8 === 2 ? String(randomInt(10, 100)) : word);
	}
	return words.join(" ");
}
