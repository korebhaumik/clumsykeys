import { quoteCatalog } from "./quote-catalog";
import type { QuoteLength } from "./quote-length";
import { proseCatalog, type PassageLanguage } from "./prose-catalog";
import { keywordCatalog } from "./keyword-catalog";
import type { CodeLanguage } from "./code-catalog";
import { sampleCycle, sampleWords, randomIndex, type RandomIndex } from "./sampling";
import { applyTokenModifiers, type TokenModifiers } from "./modifiers";

export function drawWords(language: PassageLanguage, count: number, pick: RandomIndex = randomIndex) {
	return sampleWords(proseCatalog[language].words, count, pick);
}

export function drawQuote(punctuation: boolean, pick: RandomIndex = randomIndex, length?: QuoteLength) {
	const choices = length ? quoteCatalog.filter(quote => quote.category === length) : quoteCatalog;
	const text = choices[pick(choices.length)].text;
	return text.split(/\s+/).map(word => punctuation ? word : word.replace(/[^\p{L}\p{M}\p{N}]/gu, "")).filter(Boolean);
}

type TokenRequest = {
	source: { kind: "prose"; language: PassageLanguage; count: number }
		| { kind: "keywords"; language: CodeLanguage; count: number }
		| { kind: "quote"; preservePunctuation: boolean; length?: QuoteLength };
	modifiers?: TokenModifiers;
};

/** Catalog → selection → modifiers. Callers adapt settings; renderers own DOM behavior. */
export function generateTokens({ source, modifiers = {} }: TokenRequest, pick: RandomIndex = randomIndex) {
	const words = source.kind === "quote" ? drawQuote(source.preservePunctuation, pick, source.length)
		: source.kind === "prose" ? drawWords(source.language, source.count, pick)
		: sampleCycle(keywordCatalog[source.language].words, source.count, pick);
	const resolved = source.kind === "quote" && modifiers.numbers
		? { ...modifiers, numbers: { ...modifiers.numbers, every: Math.min(words.length, modifiers.numbers.every) } }
		: modifiers;
	return applyTokenModifiers(words, resolved, pick);
}
