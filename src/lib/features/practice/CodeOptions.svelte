<script lang="ts">
    import CodeSvg from "../../components/icons/CodeIcon.svelte";
    import { languages, languageChoices } from "./code-snippets";
    let { autoTabs = $bindable(true), langChoice, onLanguageChange }: {
        autoTabs?: boolean;
        langChoice: keyof typeof languages;
        onLanguageChange: (event: Event) => void;
    } = $props();
</script>

	<div class="code-options">
		<div class="indent-options" role="group" aria-label="Indentation">
			<button type="button" aria-pressed={autoTabs} onclick={() => (autoTabs = true)}>Auto Tabs</button>
			<button type="button" aria-pressed={!autoTabs} onclick={() => (autoTabs = false)}>Manual Tabs</button>
		</div>
		<label class="language-picker">
			<CodeSvg />
			<select aria-label="Snippet language" value={langChoice} onchange={onLanguageChange}>
				{#each languageChoices as language}
					<option value={language}>{languages[language]}</option>
				{/each}
			</select>
		</label>
	</div>

<style>
	.code-options, .indent-options, .language-picker { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-0_75rem); }
	.code-options { min-height: var(--dimension-3rem); padding: var(--dimension-0_75rem) var(--dimension-1rem); border-radius: var(--radius-0_5rem); font-weight: var(--weight-600); background: var(--surface); color: var(--muted); }
	.language-picker, [aria-pressed="true"] { color: var(--accent); }
	[aria-pressed="true"], .language-picker select { text-decoration: underline; text-underline-offset: var(--dimension-0_14em); }
	.language-picker { border-left: var(--dimension-2px) solid var(--inset); padding-left: var(--dimension-0_65rem); gap: var(--dimension-0_3rem); }
	.language-picker select { cursor: pointer; max-width: 100%; background: var(--surface); }
	:global([data-theme="classic"]) :is(.code-options) {
		background: var(--accent);
		color: color-mix(in srgb, var(--accent-ink) 60%, var(--accent));
		color-scheme: dark;
	}
	:global([data-theme="classic"]) :is(.language-picker, .indent-options [aria-pressed="true"]) {
		color: var(--accent-ink);
	}
	:global([data-theme="classic"]) .language-picker {
		border-color: color-mix(in srgb, var(--accent-ink) 80%, var(--accent));
	}
	:global([data-theme="classic"]) .language-picker select { background: var(--accent); }
	:global([data-theme="classic"]) :is(.code-options) :is(button, select):focus-visible {
		outline-color: var(--accent-ink);
	}
</style>
