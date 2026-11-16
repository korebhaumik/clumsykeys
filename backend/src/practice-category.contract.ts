// Browser-safe category identity shared by practice and the authenticated PB read.
import { codeLanguages, snippetLengths } from "../../shared/content/code-catalog";
import { isRecord, type PracticeSubmission } from "./persistence.contract";

export type PracticeCategory = {
	mode: PracticeSubmission["mode"];
	language: string;
	test: "time" | "words" | "quotes" | "snippets";
	length: number | "short" | "medium" | "long";
};
const proseLanguages = ["english", "english 1k", "english 2k", "english 5k", "hinglish"];

export function parsePracticeCategory(value: unknown): PracticeCategory | undefined {
	if (!isRecord(value) || typeof value.language !== "string") return;
	const { mode, language, test } = value;
	const length = typeof value.length === "string" && /^\d+$/.test(value.length) ? Number(value.length) : value.length;
	if (mode === "prose" ? !proseLanguages.includes(language)
		: (mode !== "code-snippets" && mode !== "code-keywords") || !Object.hasOwn(codeLanguages, language)) return;
	if (mode === "code-snippets" ? test !== "snippets"
		: mode === "code-keywords" ? test !== "time" && test !== "words"
		: test !== "time" && test !== "words" && test !== "quotes") return;
	if (test === "quotes" || test === "snippets") {
		if (!snippetLengths.some(item => item === length)) return;
	} else if (!Number.isSafeInteger(length) || (length as number) <= 0 || (length as number) > 86_400) return;
	return { mode, language, test, length } as PracticeCategory;
}
