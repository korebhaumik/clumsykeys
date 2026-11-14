import { randomIndex, type RandomIndex } from "./sampling";

function addNumbers(words: readonly string[], every: number, pick: RandomIndex = randomIndex) {
	return words.flatMap((word, index) => (index + 1) % every === 0 ? [word, String(10 + pick(90))] : [word]);
}

export type TokenModifiers = {
	numbers?: { every: number; placement: "insert" | "replace"; offset?: number };
	punctuation?: { every: number; marks: string; final?: string };
	/** Inserted numbers count towards word/time passage limits; quotes stay complete. */
	count?: number;
};

export function applyTokenModifiers(words: readonly string[], modifiers: TokenModifiers, pick: RandomIndex = randomIndex) {
	const { numbers, punctuation } = modifiers;
	let tokens = [...words];
	if (numbers) {
		tokens = numbers.placement === "insert" ? addNumbers(tokens, numbers.every, pick)
			: tokens.map((word, index) => index % numbers.every === (numbers.offset ?? 0) ? String(10 + pick(90)) : word);
	}
	if (modifiers.count !== undefined) tokens = tokens.slice(0, modifiers.count);
	if (punctuation) tokens = tokens.map((word, index) => {
		if (index === tokens.length - 1 && punctuation.final !== undefined) return word + punctuation.final;
		return (index + 1) % punctuation.every === 0 || index === tokens.length - 1
			? word + punctuation.marks[pick(punctuation.marks.length)] : word;
	});
	return tokens;
}
