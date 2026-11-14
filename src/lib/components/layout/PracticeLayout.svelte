<script lang="ts">
	import type { Snippet } from "svelte";
	import { getPracticeHeader } from "./practice-header-context";
	import Footer from "./Footer.svelte";

	let { mode, active = false, finished = false, contentLabel, showShortcuts = true, children, onRestart, onSettings }: {
		mode: "prose" | "code";
		finished?: boolean;
		active?: boolean;
		contentLabel?: string;
		showShortcuts?: boolean;
		children: Snippet;
		onRestart?: () => void;
		onSettings?: () => void;
	} = $props();
	const header = getPracticeHeader();
	$effect(() => {
		header.active = active;
		return () => { header.active = false; };
	});
</script>

<div class="practice-body">
	<section class="page-content practice-content" class:compact-content={finished} aria-label={contentLabel ?? (mode === "code" ? "Code practice" : "Prose practice")}>
		{@render children()}
	</section>
	{#if showShortcuts}<div class="page-footer practice-shortcuts">
		<Footer {active} {showShortcuts} {onRestart} {onSettings} showCredits={false} />
	</div>{/if}
</div>

<style>
	.practice-body { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.practice-content { width: auto; min-width: 0; margin: auto 0; padding-block: var(--dimension-2rem); }
	.practice-shortcuts { margin-top: 0; padding-bottom: 0; }
</style>
