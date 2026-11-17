import { placePracticeCaret } from "./caret-motion";

/** Measure first, then scroll and place the caret without interleaved style/layout work. */
export function alignPracticeCaret(
	caret: HTMLElement,
	viewport: HTMLElement,
	target: Element,
	row = target,
	afterTarget?: boolean,
) {
	const bounds = viewport.getBoundingClientRect();
	const active = row.getBoundingClientRect();
	const first = viewport.firstElementChild!.getBoundingClientRect();
	const targetBounds = target.getBoundingClientRect();
	const frame = caret.parentElement!.getBoundingClientRect();
	const caretHeight = caret.offsetHeight;
	const scrollTop = viewport.scrollTop;
	const firstRowTop = first.top + scrollTop;
	const height = viewport.clientHeight;
	const maxScroll = viewport.scrollHeight - height;
	let nextScroll = scrollTop;

	// Prose siblings are words and several can share a rendered row.
	let next = row.nextElementSibling;
	while (next && next.getBoundingClientRect().top <= active.top) next = next.nextElementSibling;
	if (active.top < firstRowTop) {
		nextScroll += active.top - firstRowTop;
	} else if (next) {
		const rowAdvance = next.getBoundingClientRect().top - active.top;
		const previewLimit = firstRowTop + height - 2 * rowAdvance;
		if (active.top > previewLimit) nextScroll += active.top - previewLimit;
	} else if (active.bottom > bounds.bottom) {
		nextScroll += active.bottom - bounds.bottom;
	}
	nextScroll = Math.max(0, Math.min(maxScroll, nextScroll));
	if (nextScroll !== scrollTop) viewport.scrollTop = nextScroll;
	placePracticeCaret(caret, afterTarget === undefined ? undefined : (afterTarget ? targetBounds.right : targetBounds.left) - frame.left,
		targetBounds.top - frame.top - (nextScroll - scrollTop) + (targetBounds.height - caretHeight) / 2, nextScroll !== scrollTop);
}

export type PracticeState = "waiting" | "playing" | "finished";

export function markPracticeCharacter(target: Element, input: string, extra: boolean) {
	if (extra) {
		if (target.children.length > 10) return false;
		const letter = document.createElement("span");
		letter.className = "text-red-500";
		letter.textContent = input === "\t" ? "_" : input;
		target.appendChild(letter);
		return false;
	}

	const letter = target.firstElementChild!;
	const correct = letter.textContent === input;
	letter.className = correct ? "text-white" : "text-red-500 underline";
	return correct;
}

export function removePracticeExtra(target: Element) {
	if (target.children.length <= 1) return false;
	target.lastElementChild!.remove();
	return true;
}
