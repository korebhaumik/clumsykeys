/** Adapt the hidden typing input to touch keyboards without changing physical-key handling. */
export function mobileTyping(input: HTMLInputElement, controls: { backspace: () => void; enter: () => void }) {
	const touch = window.matchMedia("(pointer: coarse)");
	const viewport = window.visualViewport;
	const region = input.closest<HTMLElement>(".code-passage, .typing-frame")!;
	const shell = input.closest<HTMLElement>(".practice-body");
	const anchor = "\u200b";
	let frame = 0;
	let disposed = false;

	function prime() {
		if (!disposed && touch.matches && document.activeElement === input && !input.value) {
			// An empty input cannot reliably emit deletion on iOS. Keep one invisible
			// character behind the insertion point so Backspace remains observable.
			input.value = anchor;
			input.setSelectionRange(1, 1);
		}
	}

	function reveal() {
		frame = 0;
		if (!touch.matches || document.activeElement !== input || (viewport && viewport.scale !== 1)) return;
		// iOS can shrink only the visual viewport, leaving the layout viewport tall.
		// Reserve scroll room so the last passage line can still clear the keyboard.
		shell?.style.setProperty("--typing-keyboard-inset", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight))}px`);
		const bounds = region.getBoundingClientRect();
		const inset = parseFloat(getComputedStyle(input).fontSize);
		const top = (viewport?.offsetTop ?? 0) + inset;
		const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - inset;
		const shift = bounds.top < top ? bounds.top - top : bounds.bottom > bottom ? Math.min(bounds.top - top, bounds.bottom - bottom) : 0;
		if (shift) window.scrollBy({ top: shift, behavior: "instant" });
	}

	function schedule() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(reveal);
	}
	function focus() { prime(); schedule(); }
	function blur() { shell?.style.removeProperty("--typing-keyboard-inset"); }
	function beforeInput(event: InputEvent) {
		if (!touch.matches || event.isComposing) return;
		if (event.inputType === "deleteContentBackward" || event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
			event.preventDefault();
			if (event.inputType === "deleteContentBackward") controls.backspace();
			else controls.enter();
			prime();
		}
	}
	function normalize(event: Event) {
		if (!touch.matches || (event as InputEvent).isComposing) return;
		input.value = input.value.replaceAll(anchor, "");
		// Run after the engine consumes and clears this event's value.
		queueMicrotask(prime);
	}
	input.addEventListener("focus", focus);
	input.addEventListener("blur", blur);
	input.addEventListener("beforeinput", beforeInput);
	input.addEventListener("input", normalize, true);
	input.addEventListener("compositionend", normalize);
	viewport?.addEventListener("resize", schedule);
	viewport?.addEventListener("scroll", schedule);
	window.addEventListener("resize", schedule);
	const observer = new ResizeObserver(schedule);
	observer.observe(region);

	return { destroy() {
		disposed = true;
		cancelAnimationFrame(frame);
		observer.disconnect();
		input.removeEventListener("focus", focus);
		input.removeEventListener("blur", blur);
		blur();
		input.removeEventListener("beforeinput", beforeInput);
		input.removeEventListener("input", normalize, true);
		input.removeEventListener("compositionend", normalize);
		viewport?.removeEventListener("resize", schedule);
		viewport?.removeEventListener("scroll", schedule);
		window.removeEventListener("resize", schedule);
	} };
}
