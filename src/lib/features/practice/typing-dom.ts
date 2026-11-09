/** Keep the active row and its preview visible, then center the caret on the target. */
export function alignPracticeCaret(
	caret: HTMLElement,
	viewport: HTMLElement,
	target: Element,
	row = target,
) {
	const bounds = viewport.getBoundingClientRect();
	const active = row.getBoundingClientRect();
	const first = viewport.firstElementChild!.getBoundingClientRect();
	const firstRowTop = first.top + viewport.scrollTop;

	// Prose siblings are words and several can share a rendered row.
	let next = row.nextElementSibling;
	while (next && next.getBoundingClientRect().top <= active.top) {
		next = next.nextElementSibling;
	}

	if (active.top < firstRowTop) {
		viewport.scrollTop += active.top - firstRowTop;
	} else if (next) {
		const rowAdvance = next.getBoundingClientRect().top - active.top;
		const previewLimit = firstRowTop + viewport.clientHeight - 2 * rowAdvance;
		if (active.top > previewLimit) viewport.scrollTop += active.top - previewLimit;
	} else if (active.bottom > bounds.bottom) {
		viewport.scrollTop += active.bottom - bounds.bottom;
	}

	const visibleRow = target.getBoundingClientRect();
	const frame = caret.parentElement!.getBoundingClientRect();
	caret.style.top = `${visibleRow.top - frame.top + (visibleRow.height - caret.offsetHeight) / 2}px`;
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
