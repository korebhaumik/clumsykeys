/** Stable language IDs are shared with stored preferences and result contracts. */
export const codeLanguages = {
	randomPy: "Python", randomJs: "JavaScript", randomTs: "TypeScript",
	randomJava: "Java", randomCpp: "C++", randomC: "C",
};
export type CodeLanguage = keyof typeof codeLanguages;
export const codeLanguageChoices = Object.keys(codeLanguages) as CodeLanguage[];
export const snippetLengths = ["short", "medium", "long"] as const;
export type SnippetLength = typeof snippetLengths[number];
export type ContentSource = { description: string; url: string | null };
export const legacySource: ContentSource = {
	description: "Migrated from the existing Clumsy Keys catalog; original external provenance is unverified.",
	url: null,
};
