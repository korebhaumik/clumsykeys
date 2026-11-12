import english from "./english.json";
import english1k from "./english_1k.json";
import english5k from "./english_5k.json";
import hinglish from "./hinglish.json";
import englishQuotes from "./english_quotes.json";

// These entries can be typed as single words regardless of punctuation settings.
const extendedEnglish = english5k.words.filter((word) => /^[a-z]+$/i.test(word));
const lists = {
	english: english.words,
	"english-1k": english1k.words,
	"english-2k": extendedEnglish.slice(0, 2000),
	"english-5k": extendedEnglish,
	hinglish: hinglish.words,
};

export type PassageLanguage = keyof typeof lists;
type RandomIndex = (length: number) => number;

const randomIndex: RandomIndex = (length) => Math.floor(Math.random() * length);

export function drawWords(language: PassageLanguage, count: number, pick = randomIndex) {
	const list = lists[language];
	let previous = -1;
	return Array.from({ length: count }, () => {
		let index = pick(list.length - (previous === -1 ? 0 : 1));
		if (previous !== -1 && index >= previous) index += 1;
		previous = index;
		return list[index];
	});
}

export function drawQuote(punctuation: boolean, pick = randomIndex) {
	const text = englishQuotes.quotes[pick(englishQuotes.quotes.length)].text;
	return text.split(/\s+/).map((word) => punctuation ? word : word.replace(/[^\p{L}\p{M}\p{N}]/gu, "")).filter(Boolean);
}

export function addNumbers(words: string[], every: number, pick = randomIndex) {
	return words.flatMap((word, index) => (index + 1) % every === 0 ? [word, String(10 + pick(90))] : [word]);
}
