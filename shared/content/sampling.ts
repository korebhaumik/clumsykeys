/** Both Math.random in solo practice and crypto.randomInt on the server fit this contract. */
export type RandomIndex = (length: number) => number;
export const randomIndex: RandomIndex = length => Math.floor(Math.random() * length);

/** Sampling with replacement, excluding the immediately previous word. */
export function sampleWords(list: readonly string[], count: number, pick: RandomIndex = randomIndex) {
	if (!list.length) throw new Error("Cannot sample an empty word catalog");
	let previous = -1;
	return Array.from({ length: count }, () => {
		let index = pick(list.length - (previous === -1 || list.length === 1 ? 0 : 1));
		if (list.length > 1 && previous !== -1 && index >= previous) index += 1;
		previous = index;
		return list[index];
	});
}

/** Shuffle each vocabulary cycle without changing the source catalog. */
export function sampleCycle(list: readonly string[], count: number, pick: RandomIndex = randomIndex) {
	const available = [...new Set(list)];
	if (!available.length) throw new Error("Cannot sample an empty keyword catalog");
	return Array.from({ length: count }, (_, index) => {
		const start = index % available.length;
		const selected = start + pick(available.length - start);
		[available[start], available[selected]] = [available[selected], available[start]];
		return available[start];
	});
}
