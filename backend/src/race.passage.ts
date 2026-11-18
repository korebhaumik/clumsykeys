import { randomInt } from "node:crypto";
import type { RaceSettings } from "./race.settings";
import { generateTokens } from "../../shared/content/passages";

export function makeRacePassage(settings: RaceSettings) {
	return generateTokens({
		source: settings.mode === "quotes" ? { kind: "quote", preservePunctuation: settings.punctuation, length: settings.quoteLength }
			: { kind: "prose", language: settings.language, count: settings.mode === "time" ? settings.duration * 5 : settings.wordCount },
		modifiers: settings.mode === "quotes" ? {
			numbers: settings.numbers ? { every: 8, placement: "insert" } : undefined,
		} : {
			numbers: settings.numbers ? { every: 8, placement: "replace", offset: 2 } : undefined,
			punctuation: settings.punctuation ? { every: 8, marks: ",", final: "." } : undefined,
		},
	}, randomInt).join(" ");
}
