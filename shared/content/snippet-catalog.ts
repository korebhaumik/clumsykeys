import python from "./data/snippets/python.json";
import javascript from "./data/snippets/javascript.json";
import typescript from "./data/snippets/typescript.json";
import java from "./data/snippets/java.json";
import cpp from "./data/snippets/cpp.json";
import c from "./data/snippets/c.json";
import { snippetLengths, type CodeLanguage, type ContentSource, type SnippetLength } from "./code-catalog";

export type CodeSnippet = {
	readonly id: string;
	readonly language: CodeLanguage;
	readonly length: SnippetLength;
	readonly source: ContentSource;
	readonly lines: readonly string[];
};

const catalogs = {
	randomPy: python, randomJs: javascript, randomTs: typescript,
	randomJava: java, randomCpp: cpp, randomC: c,
} satisfies Record<CodeLanguage, typeof python>;

/** Categories are authored metadata, never recomputed when the catalog grows. */
export const snippetCatalog: readonly CodeSnippet[] = Object.entries(catalogs).flatMap(([language, entries]) => entries.map(entry => {
	if (entry.language !== language || !snippetLengths.some(length => length === entry.length)) {
		throw new Error(`Invalid snippet metadata: ${entry.id}`);
	}
	return { ...entry, language: entry.language as CodeLanguage, length: entry.length as SnippetLength };
}));
