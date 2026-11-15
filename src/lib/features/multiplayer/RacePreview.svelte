<script lang="ts">
	import { onMount } from "svelte";
	import { racePreviewFrame } from "./race-preview";

	let paused = $state(false);
	let reducedMotion = $state(true);
	let visible = $state(true);
	let elapsed = $state(0);
	let previewElement = $state<HTMLElement>();
	const frame = $derived(racePreviewFrame(reducedMotion ? 7000 : elapsed));

	onMount(() => {
		const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
		const updateMotion = () => reducedMotion = preference.matches;
		const updateVisibility = () => visible = !document.hidden;
		updateMotion(); updateVisibility();
		preference.addEventListener("change", updateMotion);
		document.addEventListener("visibilitychange", updateVisibility);
		return () => {
			preference.removeEventListener("change", updateMotion);
			document.removeEventListener("visibilitychange", updateVisibility);
		};
	});

	$effect(() => {
		if (paused || reducedMotion || !visible) return;
		let previous = performance.now();
		let request: number;
		function advance(now: number) {
			elapsed += now - previous;
			previous = now;
			request = window.requestAnimationFrame(advance);
		}
		request = window.requestAnimationFrame(advance);
		return () => window.cancelAnimationFrame(request);
	});
	$effect(() => {
		const players = frame.players;
		if (!previewElement) return;
		for (const [index, viewport] of previewElement.querySelectorAll<HTMLElement>(".typing-viewport").entries()) {
			const caret = viewport.querySelector<HTMLElement>(".caret");
			viewport.scrollLeft = players[index].count === 0 ? 0 : caret ? Math.max(0, caret.offsetLeft - viewport.clientWidth * .65) : viewport.scrollWidth;
		}
	});
</script>

<section class="race-preview" class:paused bind:this={previewElement} aria-label="Two-player race preview">
	<div class="preview-heading">
		<span>Head-to-head.</span>
		{#if !reducedMotion}<button type="button" class="preview-control" aria-label={paused ? "Resume race preview" : "Pause race preview"} onclick={() => paused = !paused}>{paused ? "Play" : "Pause"}</button>{/if}
	</div>
	<div class="preview-lanes" aria-hidden="true" style:opacity={reducedMotion ? 1 : frame.opacity}>
		{#each frame.players as player (player.name)}
			<div class="preview-lane" class:finished={player.count === frame.phrase.length}>
				<span class="player-name">{player.name}</span>
				<div class="typing-viewport"><div class="typing-phrase">
					{#each [...frame.phrase] as character, index (index)}<span class="character" class:typed={index < player.count} class:mistake={player.mistake && index === player.count - 1} class:caret={index === player.count}>{player.mistake && index === player.count - 1 ? "x" : character}</span>{/each}
				</div></div>
			</div>
		{/each}
	</div>
</section>

<style>
	.race-preview { margin-top: var(--dimension-1_25rem); padding: var(--dimension-0_75rem) var(--dimension-1rem); border: var(--dimension-1px) solid color-mix(in srgb, var(--line) 50%, transparent); border-radius: var(--radius-0_75rem); background: color-mix(in srgb, var(--surface) 60%, transparent); }
	.preview-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-0_75rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.preview-control { flex: none; border-radius: var(--radius-0_3rem); color: var(--ink); cursor: pointer; }
	.preview-control:hover { color: var(--accent); }
	.preview-lanes { display: grid; gap: var(--dimension-0_5rem); margin-top: var(--dimension-0_75rem); }
	.preview-lane { display: grid; grid-template-columns: var(--dimension-2_5rem) minmax(0, 1fr); align-items: center; gap: var(--dimension-0_75rem); min-height: var(--dimension-1_5rem); }
	.player-name { font-size: var(--text-0_75rem); color: var(--muted); }
	.finished .player-name { color: var(--accent); }
	.typing-viewport { min-width: 0; overflow: hidden; padding-inline: var(--dimension-2px); }
	.typing-phrase { position: relative; width: max-content; min-width: 100%; white-space: pre; font-size: var(--text-0_875rem); letter-spacing: var(--tracking-0_025em); }
	.character { position: relative; color: var(--muted); }
	.typed { color: var(--ink); }
	.mistake { color: var(--error); text-decoration: underline; }
	.caret::before { content: ""; position: absolute; top: 0; bottom: 0; left: calc(-1 * var(--dimension-1px)); width: var(--dimension-2px); background: var(--caret); border-radius: var(--radius-2px); }
	@media (prefers-reduced-motion: no-preference) { .caret::before { animation: preview-caret var(--motion-1_2s) step-end infinite; } .paused .caret::before { animation-play-state: paused; } }
	@keyframes preview-caret { 50% { opacity: .4; } }
</style>
