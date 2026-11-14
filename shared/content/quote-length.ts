export const quoteLengths = ["short", "medium", "long"] as const;
export type QuoteLength = typeof quoteLengths[number];

/** Classify complete, unmodified quote text so modifiers never change its category. */
export function quoteLengthOf(text: string): QuoteLength {
	return text.length <= 100 ? "short" : text.length <= 300 ? "medium" : "long";
}
