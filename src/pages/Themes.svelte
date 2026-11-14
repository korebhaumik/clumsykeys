<script lang="ts">
	import Dropdown from "../lib/components/Dropdown.svelte";
	import { theme, themeBackgrounds, type themeType } from "../lib/state/app.store";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";

	const themes = [
		{ value: "classic", label: "Classic" },
		{ value: "dark-forest", label: "Dark Forest" },
	] as const;
	const selectedLabel = $derived($theme === "classic" ? "Classic" : "Dark Forest");

	const handleChange = (selectedTheme: themeType) => {
		theme.set(selectedTheme);
		try { localStorage.setItem("theme", selectedTheme); } catch { /* Keep theme selection usable without storage. */ }
	};
</script>

<PracticeLayout mode="prose" contentLabel="Appearance" showShortcuts={false}>
	<div class="page-heading">
		<p class="eyebrow">Settings</p>
		<h1>Appearance</h1>
		<p class="lede">Choose how Clumsy Keys looks while you practice.</p>
	</div>

	<div class="appearance-grid">
		<div class="panel theme-picker">
			<div class="field">
				<span>Color theme</span>
				<Dropdown label="Color theme" options={themes} value={$theme} onchange={handleChange} describedBy="theme-save-note" />
			</div>
			<p id="theme-save-note" class="muted">Changes apply immediately and are saved on this device.</p>
		</div>

		<figure class="panel typing-card theme-preview" aria-labelledby="theme-preview-title">
			<figcaption class="typing-toolbar">
				<span class="panel-title" id="theme-preview-title">Practice preview</span>
				<span class="badge badge-accent"><span class="status-dot" aria-hidden="true"></span>{selectedLabel}</span>
			</figcaption>

			<div class={themeBackgrounds[$theme]}>
				<p class="typing-frame theme-sample">
					<span class="typing-word text-white">Small</span>
					<span class="typing-word text-white">steps</span>
					<span class="typing-word caret-word"><span class="text-white">ma</span><span class="text-red-500 underline">k</span><span class="text-zinc-600">e</span></span>
					<span class="typing-word text-zinc-600">steady</span>
					<span class="typing-word text-zinc-600">progress.</span>
					<span class="sample-next-line text-zinc-600">Find your rhythm, one key at a time.</span>
				</p>
			</div>

			<div class="typing-footer">
				<span><i class="sample-typed"></i>Typed</span>
				<span><i class="sample-error"></i>Mistake</span>
				<span><i class="sample-caret"></i>Caret</span>
			</div>
		</figure>
	</div>
</PracticeLayout>

<style>
	.appearance-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr); align-items: start; gap: var(--dimension-1rem); }
	.theme-picker p { margin-top: var(--dimension-0_8rem); font-size: var(--text-0_82rem); }
	.theme-preview { overflow: hidden; }
	.theme-sample { padding: clamp(var(--dimension-1_15rem), var(--dimension-4vw), var(--dimension-1_8rem)) var(--dimension-1_15rem); font-family: inherit; font-size: clamp(var(--text-1rem), var(--text-2_4vw), var(--text-1_25rem)); line-height: var(--leading-1_65); }
	.sample-next-line { display: block; width: 100%; font-size: inherit; letter-spacing: var(--tracking-0_1em); }
	.caret-word .text-zinc-600 { position: relative; }
	.caret-word .text-zinc-600::before {
		position: absolute;
		inset: var(--dimension-0_02em) auto var(--dimension-0_02em) var(--dimension-negative-_07em);
		width: var(--dimension-2px);
		border-radius: var(--radius-2px);
		background: var(--caret);
		content: "";
	}
	.typing-footer { justify-content: flex-start; column-gap: var(--dimension-1rem); }
	.typing-footer span { display: inline-flex; align-items: center; gap: var(--dimension-0_35rem); }
	.typing-footer i { width: var(--dimension-0_45rem); height: var(--dimension-0_45rem); border-radius: 50%; }
	.sample-typed { background: var(--ink); }
	.sample-error { background: var(--error); }
	.sample-caret { background: var(--caret); }

	@media (max-width: 40rem) {
		.appearance-grid { grid-template-columns: minmax(0, 1fr); }
	}
</style>
