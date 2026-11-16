<script lang="ts">
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";
	import { cubicIn } from "svelte/easing";
	import TrophyIcon from "../../components/icons/TrophyIcon.svelte";
	import CrossIcon from "../../components/icons/CrossIcon.svelte";
	import { account } from "../../state/account.store";
	import { personalBestCategoryLabel, type PersonalBest } from "./personal-best";

	let { achievement, accountId, onDismiss }: { achievement: Promise<PersonalBest | undefined>; accountId: string | null; onDismiss: () => void } = $props();
	let best = $state<PersonalBest>();

	function exitToast(node: HTMLElement) {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const duration = Number.parseFloat(window.getComputedStyle(node).getPropertyValue("--motion-420ms")) || 0;
		const top = Number.parseFloat(window.getComputedStyle(node.parentElement!).top) || 0;
		return fly(node, { y: -node.getBoundingClientRect().height - top, duration: reducedMotion ? 0 : duration, easing: cubicIn });
	}

	onMount(() => {
		let active = true;
		let timer: ReturnType<typeof setTimeout>;
		void achievement.then(value => {
			if (!active) return;
			best = value;
			// Keep a keyboard-focused notification available for explicit dismissal.
			timer = setTimeout(() => { if (!document.activeElement?.closest(".personal-best")) best = undefined; }, 8000);
		});
		return () => { active = false; clearTimeout(timer); };
	});
</script>

<div class="celebration-region" role="status" aria-live="polite" aria-atomic="true">
	{#if best && ($account.session?.user.id ?? null) === accountId}
		<aside class="personal-best" aria-label="New personal best" out:exitToast>
			<div class="reward-heading">
				<span class="unlock-label">Achievement unlocked</span>
				<button tabindex="0" type="button" aria-label="Dismiss personal best" onclick={() => { best = undefined; onDismiss(); }}><CrossIcon /></button>
			</div>
			<div class="reward-main">
				<div class="medal" aria-hidden="true">
					<span class="medal-ring"><span class="trophy"><TrophyIcon /></span></span>
					<span class="sparkle sparkle-one"></span><span class="sparkle sparkle-two"></span><span class="sparkle sparkle-three"></span>
				</div>
				<div class="achievement-copy">
					<p class="achievement-label">New personal best!</p>
					<div class="score-row"><p class="score"><strong>{best.wpm}</strong><span>WPM</span></p><span class="improvement">+{best.wpm - best.previous} WPM</span></div>
				</div>
			</div>
			<div class="reward-footer">
				<span class="mode-label">{personalBestCategoryLabel(best.category)}{accountId ? "" : " · This device"}</span>
				<span>Previous best: {best.previous} WPM</span>
			</div>
		</aside>
	{/if}
</div>

<style>
	.celebration-region { position: fixed; top: var(--dimension-1rem); inset-inline: var(--dimension-1rem); z-index: 100; pointer-events: none; }
	.personal-best { width: min(var(--dimension-28rem), 100%); margin-inline: auto; border: var(--dimension-1px) solid var(--accent); border-radius: var(--radius-1rem); background: var(--surface); color: var(--ink); pointer-events: auto; }
	.reward-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-0_5rem); padding: var(--dimension-0_75rem) var(--dimension-1rem) 0; }
	.unlock-label { padding: var(--dimension-0_25rem) var(--dimension-0_55rem); border-radius: var(--radius-99px); background: var(--accent-wash); color: var(--accent); font: var(--weight-600) var(--text-0_7rem) var(--mono); letter-spacing: var(--tracking-0_1em); text-transform: uppercase; }
	.reward-main { display: flex; align-items: center; gap: var(--dimension-1rem); padding: var(--dimension-0_75rem) var(--dimension-1_25rem) var(--dimension-1rem); }
	.medal { position: relative; flex: none; }
	.medal-ring { display: grid; place-items: center; width: var(--dimension-4rem); height: var(--dimension-4rem); border: var(--dimension-1px) solid var(--accent); border-radius: 50%; background: var(--accent-wash); }
	.trophy { display: grid; place-items: center; width: var(--dimension-3_5rem); height: var(--dimension-3_5rem); border-radius: 50%; background: var(--accent); color: var(--accent-ink); }
	.trophy :global(svg) { width: var(--dimension-2rem); height: var(--dimension-2rem); }
	.sparkle { position: absolute; width: var(--dimension-0_65rem); height: var(--dimension-0_65rem); background: var(--accent); clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); }
	.sparkle-one { top: calc(-1 * var(--dimension-0_35rem)); right: 0; }
	.sparkle-two { bottom: var(--dimension-0_15rem); left: calc(-1 * var(--dimension-0_5rem)); width: var(--dimension-0_45rem); height: var(--dimension-0_45rem); }
	.sparkle-three { right: calc(-1 * var(--dimension-0_65rem)); bottom: var(--dimension-0_5rem); width: var(--dimension-0_35rem); height: var(--dimension-0_35rem); }
	.achievement-copy { min-width: 0; }
	.achievement-label { font-size: var(--text-1_125rem); line-height: var(--leading-1_5); font-weight: var(--weight-700); letter-spacing: var(--tracking-negative-_045em); }
	.score-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-0_5rem) var(--dimension-0_75rem); margin-top: var(--dimension-0_35rem); }
	.score { display: flex; align-items: baseline; gap: var(--dimension-0_35rem); }
	.score strong { font-size: var(--text-2_5rem); font-weight: var(--weight-700); line-height: var(--leading-1_1); letter-spacing: var(--tracking-negative-_045em); font-variant-numeric: tabular-nums; }
	.score > span { color: var(--muted); font: var(--text-0_75rem) var(--mono); }
	.improvement { padding: var(--dimension-0_35rem) var(--dimension-0_55rem); border-radius: var(--radius-99px); background: var(--accent); color: var(--accent-ink); font: var(--weight-600) var(--text-0_75rem) var(--mono); white-space: nowrap; }
	.reward-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--dimension-0_35rem) var(--dimension-0_75rem); padding: var(--dimension-0_75rem) var(--dimension-1rem); border-top: var(--dimension-1px) solid var(--line); border-radius: 0 0 var(--radius-1rem) var(--radius-1rem); color: var(--muted); font-size: var(--text-0_72rem); }
	.mode-label { color: var(--ink); }
	button { display: grid; place-items: center; flex: none; width: var(--dimension-1_5rem); height: var(--dimension-1_5rem); border-radius: var(--radius-99px); color: var(--muted); }
	button:hover { color: var(--ink); background: var(--accent-wash); }
	@media (max-width: 30rem) {
		.reward-main { gap: var(--dimension-0_75rem); padding: var(--dimension-1rem); }
		.medal-ring { width: var(--dimension-3_5rem); height: var(--dimension-3_5rem); }
		.trophy { width: var(--dimension-3rem); height: var(--dimension-3rem); }
		.trophy :global(svg) { width: var(--dimension-1_75rem); height: var(--dimension-1_75rem); }
		.achievement-label { font-size: var(--text-1rem); }
		.score strong { font-size: var(--text-2rem); }
		.unlock-label { font-size: var(--text-0_7rem); letter-spacing: var(--tracking-0_025em); }
	}
	@media (prefers-reduced-motion: no-preference) {
		.personal-best { animation: celebrate var(--motion-420ms) cubic-bezier(.16, 1, .3, 1); }
		.medal-ring { animation: medal-pop var(--motion-600ms) cubic-bezier(.16, 1, .3, 1); }
		.sparkle { animation: reward-spark var(--motion-600ms) ease-out; }
	}
	@keyframes celebrate { from { opacity: 0; transform: translateY(calc(-100% - var(--dimension-1rem))); } to { opacity: 1; transform: translateY(0); } }
	@keyframes medal-pop { 0%, 20% { transform: scale(.6) rotate(-12deg); } 70% { transform: scale(1.08) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
	@keyframes reward-spark { 0%, 30% { opacity: 0; transform: scale(0); } 65% { opacity: 1; transform: scale(1.4); } 100% { opacity: 1; transform: scale(1); } }
</style>
