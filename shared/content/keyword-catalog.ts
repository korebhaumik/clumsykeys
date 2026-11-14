import python from "./data/keywords/python.json";
import javascript from "./data/keywords/javascript.json";
import typescript from "./data/keywords/typescript.json";
import java from "./data/keywords/java.json";
import cpp from "./data/keywords/cpp.json";
import c from "./data/keywords/c.json";
import { legacySource, type CodeLanguage } from "./code-catalog";

export const keywordCatalog = {
	randomPy: { ...python, source: legacySource },
	randomJs: { ...javascript, source: legacySource },
	randomTs: { ...typescript, source: legacySource },
	randomJava: { ...java, source: legacySource },
	randomCpp: { ...cpp, source: legacySource },
	randomC: { ...c, source: legacySource },
} satisfies Record<CodeLanguage, { name: string; words: readonly string[]; source: typeof legacySource }>;
