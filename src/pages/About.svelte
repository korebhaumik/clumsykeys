<script lang="ts">
	import ArrowRightIcon from "../lib/components/icons/ArrowRightIcon.svelte";
	import CodeIcon from "../lib/components/icons/CodeIcon.svelte";
	import KeyboardIcon from "../lib/components/icons/KeyboardIcon.svelte";
	import RocketIcon from "../lib/components/icons/RocketIcon.svelte";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";

	const modes = [
		{ id: "prose", title: "Prose practice", href: "#/", icon: KeyboardIcon, description: "Find your rhythm with words, quotes, and passages." },
		{ id: "code", title: "Code practice", href: "#/game", icon: CodeIcon, description: "Build familiarity with code snippets and keywords." },
		{ id: "race", title: "Multiplayer", href: "#/race", icon: RocketIcon, description: "Race your friends in a shared typing room." },
	];
</script>

<PracticeLayout mode="prose" contentLabel="About Clumsy Keys" showShortcuts={false}>
	<div class="about-page">
		<header class="about-heading">
			<h1><span class="about-label">About</span> <span class="about-name">Clumsy Keys</span></h1>
			<p class="about-description">Prose, code, and friendly competition.</p>
		</header>

		<section aria-labelledby="about-practice">
			<h2 id="about-practice">Find your practice mode</h2>
			<nav class="about-modes" aria-label="Practice modes">
				{#each modes as mode}
					<a tabindex="0" class="mode-link" href={mode.href} aria-labelledby={`${mode.id}-title`} aria-describedby={`${mode.id}-description`}>
						<span class="mode-icon"><mode.icon /></span>
						<div class="mode-copy">
							<h3 id={`${mode.id}-title`}>{mode.title}</h3>
							<p id={`${mode.id}-description`}>{mode.description}</p>
						</div>
						<span class="mode-arrow"><ArrowRightIcon /></span>
					</a>
				{/each}
			</nav>
		</section>
	</div>
</PracticeLayout>

<style>
	.about-page { width: 100%; }
	.about-heading { margin-bottom: var(--dimension-2_5rem); }
	.about-heading h1 { min-width: 0; font-weight: var(--weight-700); }
	.about-label { display: block; margin-bottom: var(--dimension-0_75rem); color: var(--accent); font: var(--weight-600) var(--text-0_75rem) var(--mono); letter-spacing: var(--tracking-0_13em); text-transform: uppercase; }
	.about-name { display: block; font-size: clamp(var(--text-2rem), var(--text-4vw), var(--text-2_75rem)); line-height: var(--leading-1_2); letter-spacing: var(--tracking-negative-_045em); }
	.about-description { margin-top: var(--dimension-0_75rem); color: var(--muted); line-height: var(--leading-1_65); font-size: var(--text-0_85rem); }
	h2 { margin-bottom: var(--dimension-0_75rem); color: var(--muted); font: var(--weight-400) var(--text-0_75rem) var(--mono); }
	.about-modes { border-top: var(--dimension-1px) solid var(--line); }
	.mode-link { display: flex; align-items: center; gap: var(--dimension-1_25rem); padding: var(--dimension-1_5rem) var(--dimension-0_75rem); border-bottom: var(--dimension-1px) solid var(--line); }
	.mode-icon { display: grid; place-items: center; flex: none; width: var(--dimension-1_5rem); color: var(--accent); }
	.mode-copy { min-width: 0; }
	h3 { font-size: var(--text-0_9rem); font-weight: var(--weight-600); }
	.mode-copy p { margin-top: var(--dimension-0_35rem); color: var(--muted); font-size: var(--text-0_82rem); line-height: var(--leading-1_65); }
	.mode-arrow { flex: none; margin-left: auto; color: var(--muted); }
	.mode-link:is(:hover, :focus-visible) { background: var(--surface); }
	.mode-link:is(:hover, :focus-visible) .mode-arrow { color: var(--accent); }

	@media (max-width: 40rem) {
		.about-heading { margin-bottom: var(--dimension-2rem); }
		.mode-link { gap: var(--dimension-0_85rem); padding: var(--dimension-1_25rem) var(--dimension-0_25rem); }
	}
</style>
