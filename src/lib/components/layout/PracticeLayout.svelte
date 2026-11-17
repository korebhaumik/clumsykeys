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
	function typingFocusLayout(node: HTMLElement) {
		let selecting = false;
		let releaseTimer: number | undefined;
		const sync = () => node.classList.toggle("typing-focused", !!node.querySelector(".typing-frame > input:focus"));
		const focus = () => { if (!selecting || node.querySelector(".typing-frame > input:focus")) sync(); };
		const blur = () => { if (!selecting) window.queueMicrotask(sync); };
		const select = () => { selecting = true; window.clearTimeout(releaseTimer); };
		const commit = () => { selecting = false; sync(); };
		const release = () => { releaseTimer = window.setTimeout(commit, 350); };
		// Keep controls still between pointer-down focus and click activation.
		node.addEventListener("pointerdown", select, true);
		node.addEventListener("focusin", focus);
		node.addEventListener("focusout", blur);
		document.addEventListener("click", commit);
		document.addEventListener("pointerup", release);
		document.addEventListener("pointercancel", commit);
		window.queueMicrotask(sync);
		return { destroy() {
			window.clearTimeout(releaseTimer);
			node.removeEventListener("pointerdown", select, true);
			node.removeEventListener("focusin", focus);
			node.removeEventListener("focusout", blur);
			document.removeEventListener("click", commit);
			document.removeEventListener("pointerup", release);
			document.removeEventListener("pointercancel", commit);
		} };
	}
</script>

<div class="practice-body">
	<section use:typingFocusLayout class="page-content practice-content" class:compact-content={finished} aria-label={contentLabel ?? (mode === "code" ? "Code practice" : "Prose practice")}>
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
	@media (max-width: 40rem) {
		.practice-body { padding-bottom: var(--typing-keyboard-inset, 0px); }
		.practice-content { margin-block: 0; padding-block: var(--dimension-1rem); }
		.practice-content:has(:global(.typing-window)) { margin-block: auto; }
		.practice-content:global(.typing-focused) { margin-block: 0; }
		.practice-content:global(.typing-focused) :global(.typing-cover) { display: none; }
		.practice-shortcuts { display: none; }
	}
</style>
