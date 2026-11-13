<script lang="ts">
	import type { Snippet } from "svelte";
	import Navbar from "./Navbar.svelte";
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
</script>

<div class="page-shell practice-shell" class:finished>
	<Navbar {mode} {active} />
	<section class="page-content practice-content" class:compact-content={finished} aria-label={contentLabel ?? (mode === "code" ? "Code practice" : "Prose practice")}>
		{@render children()}
	</section>
	{#if showShortcuts}<div class="page-footer practice-shortcuts">
		<Footer {active} {showShortcuts} {onRestart} {onSettings} showCredits={false} />
	</div>{/if}
</div>

<style>
	.practice-shortcuts { margin-top: 0; padding-bottom: 0; }
</style>
