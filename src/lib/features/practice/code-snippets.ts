import { pythonArr, javascriptArr, javaArr, cppArr, cArr, tsArr } from "./snippets";

export const langData = {
	randomPy: pythonArr,
	randomJs: javascriptArr,
	randomTs: tsArr,
	randomJava: javaArr,
	randomCpp: cppArr,
	randomC: cArr,
};

export const languages = {
	randomPy: "Python",
	randomJs: "JavaScript",
	randomTs: "TypeScript",
	randomJava: "Java",
	randomCpp: "C++",
	randomC: "C",
} satisfies Record<keyof typeof langData, string>;
export const languageChoices = Object.keys(languages) as (keyof typeof languages)[];


/** Tabs are indentation markers; spaces remain word boundaries for keyboard navigation. */
export function parseSnippet(lines: string[]) {
    return lines.map((line, index) => ({
        content: line.replaceAll("\t", "").split(" "),
        indents: line.split("\t").length - 1,
        index,
    }));
}
