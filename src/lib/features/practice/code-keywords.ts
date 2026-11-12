import type { languages } from "./code-snippets";
import python from "./keywords/code_python.json";
import javascript from "./keywords/code_javascript.json";
import { addNumbers } from "../../../../backend/src/words/passages";

const keywordLists = {
	randomPy: python.words,
	randomJs: javascript.words,
	randomTs: "abstract any as asserts async await boolean class const declare enum export extends function implements import infer interface is keyof let namespace never null number object private protected public readonly return static string symbol type typeof undefined unknown void".split(" "),
	randomJava: "abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static super switch synchronized this throw throws try void while".split(" "),
	randomCpp: "alignas auto bool break case catch char class const constexpr continue decltype default delete double else enum explicit extern false float for friend if inline int long namespace new noexcept nullptr operator private protected public return sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void while".split(" "),
	randomC: "auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while".split(" "),
} satisfies Record<keyof typeof languages, string[]>;

export type KeywordLimit = { type: "time" | "words"; value: number };
export type KeywordModifiers = { numbers: boolean; punctuation: boolean };

export function drawCodeKeywords(language: keyof typeof languages, count = 25, modifiers?: KeywordModifiers) {
	const available = [...new Set(keywordLists[language])];
	const words: string[] = [];
	for (let index = 0; index < count; index += 1) {
		const start = index % available.length;
		const pick = start + Math.floor(Math.random() * (available.length - start));
		[available[start], available[pick]] = [available[pick], available[start]];
		words.push(available[start]);
	}
	const tokens = modifiers?.numbers ? addNumbers(words, 5).slice(0, count) : words;
	if (!modifiers?.punctuation) return tokens;
	const marks = ",;:.!?";
	return tokens.map((word, index) => index % 4 === 3 || index === tokens.length - 1
		? word + marks[Math.floor(Math.random() * marks.length)]
		: word);
}
