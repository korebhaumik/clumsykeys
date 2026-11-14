import english from "./data/prose/english.json";
import english1k from "./data/prose/english_1k.json";
import english5k from "./data/prose/english_5k.json";
import hinglish from "./data/prose/hinglish.json";
import { legacySource } from "./code-catalog";

// Preserve the original filtering and ordering, including the derived 2K subset.
const extendedEnglish = english5k.words.filter(word => /^[a-z]+$/i.test(word));
export const proseCatalog = {
	english: { words: english.words, source: legacySource },
	"english-1k": { words: english1k.words, source: legacySource },
	"english-2k": { words: extendedEnglish.slice(0, 2000), source: legacySource },
	"english-5k": { words: extendedEnglish, source: legacySource },
	hinglish: { words: hinglish.words, source: legacySource },
};
export type PassageLanguage = keyof typeof proseCatalog;
