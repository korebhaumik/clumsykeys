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
	<footer class="page-footer">
		<Footer {active} {showShortcuts} {onRestart} {onSettings} />
	</footer>
</div>

<style>
	.finished .page-footer { margin-top: 0; }
</style>
