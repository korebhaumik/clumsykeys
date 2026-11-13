import { isRecord, type PracticeSummary } from "../../../../backend/src/persistence.contract";

export const practiceModes = [
	{ value: "prose", label: "Prose" },
	{ value: "code-snippets", label: "Code snippets" },
	{ value: "code-keywords", label: "Code keywords" },
] as const;

export function typingTime(seconds: number) {
	const total = Math.floor(seconds);
	return [Math.floor(total / 3600), Math.floor(total % 3600 / 60), total % 60]
		.map(value => String(value).padStart(2, "0")).join(":");
}

export function testLabel(row: PracticeSummary) {
	const settings = isRecord(row.settings) ? row.settings : {};
	if (row.mode === "prose") {
		if (typeof settings.timer === "number") return `${settings.timer}s`;
		if (typeof settings.words === "number") return `${settings.words} words`;
		if (settings.quotes) return "Quote";
	} else if (isRecord(settings.limit)) {
		return `${settings.limit.value} ${settings.limit.type === "time" ? "seconds" : "words"}`;
	}
	return "Practice";
}

export function testLanguage(language: string) {
	return ({ randomPy: "Python", randomJs: "JavaScript", randomTs: "TypeScript", randomJava: "Java", randomCpp: "C++", randomC: "C" } as Record<string, string>)[language] ?? language;
}

export function safeWebsite(value: unknown) {
	if (typeof value !== "string" || !value.trim()) return null;
	try {
		const url = new URL(value.includes("://") ? value : `https://${value}`);
		return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
	} catch { return null; }
}
