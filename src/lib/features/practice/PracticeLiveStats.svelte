<script lang="ts">
	import { fade } from "svelte/transition";
	import type { PracticeStats } from "./session";

	let { stats }: { stats?: PracticeStats } = $props();
</script>

<div class="practice-live-stats" role="group" aria-label="Live test stats" transition:fade={{ duration: 160 }}>
	<span>{Math.floor(stats?.elapsedSeconds ?? 0)}s</span>
	<span>{stats?.wpm ?? 0} wpm</span>
	<span>{stats?.accuracy ?? 100}%</span>
</div>

<style>
	.practice-live-stats { display: flex; align-items: center; flex-wrap: wrap; gap: var(--dimension-0_4rem) 0; margin-top: var(--dimension-0_75rem); padding-block: var(--dimension-0_75rem); color: var(--accent); font-size: var(--text-1_125rem); font-weight: var(--weight-600); letter-spacing: var(--tracking-0_025em); }
	span + span { border-left: var(--dimension-2px) solid currentColor; margin-left: clamp(var(--dimension-0_65rem), var(--dimension-2vw), var(--dimension-1_25rem)); padding-left: clamp(var(--dimension-0_65rem), var(--dimension-2vw), var(--dimension-1_25rem)); }
</style>
