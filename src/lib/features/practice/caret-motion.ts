type CaretMotion = { left: number; top: number; fromX: number; animation?: Animation; duration: number };
const positions = new WeakMap<HTMLElement, CaretMotion>();
let touchMotion: MediaQueryList | undefined;

/** Retarget a short compositor animation without reading layout or queuing moves. */
export function placePracticeCaret(caret: HTMLElement, left: number | undefined, top: number, scrolling: boolean) {
	const previous = positions.get(caret);
	const nextLeft = left ?? (parseFloat(caret.style.left) || 0);
	const duration = previous?.duration ?? parseFloat(getComputedStyle(caret).getPropertyValue("--motion-50ms"));
	touchMotion ??= window.matchMedia("(pointer: coarse) and (prefers-reduced-motion: no-preference)");
	const progress = previous?.animation?.effect?.getComputedTiming().progress ?? 1;
	const fromX = previous ? previous.left - nextLeft + previous.fromX * (1 - progress) : 0;
	previous?.animation?.cancel();
	if (left !== undefined) caret.style.left = `${left}px`;
	caret.style.top = `${top}px`;
	const state: CaretMotion = { left: nextLeft, top, fromX: 0, duration };
	// Snap row changes and scrolling rather than sweeping across the passage.
	if (touchMotion.matches && previous && !scrolling && Math.abs(previous.top - top) < 1 && Math.abs(fromX) > 0.1) {
		state.fromX = fromX;
		state.animation = caret.animate([
			{ transform: `translateX(${fromX}px)` },
			{ transform: "translateX(0)" },
		], { duration, easing: "ease-out" });
	}
	positions.set(caret, state);
}
