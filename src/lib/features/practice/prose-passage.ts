import { generateTokens } from "../../../../shared/content/passages";
import { randomIndex, type RandomIndex } from "../../../../shared/content/sampling";
import type { TestConfig } from "../settings/settings.store";

const punctuationMarks = { easy: ',.!?"\':;', mid: "@#$%&*", hard: "()_-=+[]", insane: "~`|{}" };
const numberIntervals = { easy: 15, mid: 10, hard: 5, insane: 1 };

export function makeProsePassage(config: TestConfig, pick: RandomIndex = randomIndex) {
	const count = config.words ?? (config.timer ?? 30) * 5;
	const language = config.language === "english 1k" ? "english-1k"
		: config.language === "english 2k" ? "english-2k"
		: config.language === "english 5k" ? "english-5k" : config.language;
	return generateTokens({
		source: config.quotes ? { kind: "quote", preservePunctuation: config.punctuations !== null, length: config.quoteLength ?? "medium" }
			: { kind: "prose", language, count },
		modifiers: {
			count: config.quotes ? undefined : count,
			numbers: config.numbers ? { every: numberIntervals[config.numbers], placement: "insert" } : undefined,
			punctuation: !config.quotes && config.punctuations ? { every: 4, marks: punctuationMarks[config.punctuations] } : undefined,
		},
	}, pick);
}
