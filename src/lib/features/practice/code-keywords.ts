import type { CodeLanguage } from "../../../../shared/content/code-catalog";
import { generateTokens } from "../../../../shared/content/passages";
import { randomIndex, type RandomIndex } from "../../../../shared/content/sampling";

export type KeywordLimit = { type: "time" | "words"; value: number };
export type KeywordModifiers = { numbers: boolean; punctuation: boolean };

export function drawCodeKeywords(language: CodeLanguage, count = 25, modifiers?: KeywordModifiers, pick: RandomIndex = randomIndex) {
	return generateTokens({
		source: { kind: "keywords", language, count },
		modifiers: {
			count,
			numbers: modifiers?.numbers ? { every: 5, placement: "insert" } : undefined,
			punctuation: modifiers?.punctuation ? { every: 4, marks: ",;:.!?" } : undefined,
		},
	}, pick);
}
