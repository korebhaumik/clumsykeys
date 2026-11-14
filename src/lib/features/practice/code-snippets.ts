/** Tabs are indentation markers; spaces remain word boundaries for keyboard navigation. */
export function parseSnippet(lines: readonly string[]) {
    return lines.map((line, index) => ({
        content: line.replaceAll("\t", "").split(" "),
        indents: line.split("\t").length - 1,
        index,
    }));
}
