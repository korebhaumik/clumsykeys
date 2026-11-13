<script lang="ts">
    import Dropdown from "../../components/Dropdown.svelte";
    import CodeSvg from "../../components/icons/CodeIcon.svelte";
    import TimerSvg from "../../components/icons/TimerIcon.svelte";
    import AtSvg from "../../components/icons/AtIcon.svelte";
    import HashSvg from "../../components/icons/HashIcon.svelte";
    import { languages, languageChoices } from "./code-snippets";
    import type { KeywordLimit, KeywordModifiers } from "./code-keywords";
    import { practiceDurations, practiceWordCounts } from "./practice-options";
    let { autoTabs = $bindable(true), langChoice, mode, section, keywordLimit, modifiers, onLimitChange, onToggleModifier, onLanguageChange }: {
        autoTabs?: boolean;
        langChoice: keyof typeof languages;
        mode: "snippets" | "keywords";
        section: "test" | "details";
        keywordLimit: KeywordLimit;
        modifiers: KeywordModifiers;
        onLimitChange: (limit: KeywordLimit) => void;
        onToggleModifier: (modifier: keyof KeywordModifiers) => void;
        onLanguageChange: (language: keyof typeof languages) => void;
    } = $props();
</script>

	<div class="code-options">
		{#if section === "test"}
			<div class="option-group" role="group" aria-label="Keyword test type">
				<button class="type-option" type="button" aria-pressed={keywordLimit.type === "time"} onclick={() => onLimitChange({ type: "time", value: 30 })}><TimerSvg /> Time</button>
				<button class="type-option" type="button" aria-pressed={keywordLimit.type === "words"} onclick={() => onLimitChange({ type: "words", value: 25 })}><span aria-hidden="true">Aa</span> Words</button>
			</div>
			<div class="option-group presets" role="group" aria-label={keywordLimit.type === "time" ? "Duration in seconds" : "Word count"}>
				{#each keywordLimit.type === "time" ? practiceDurations : practiceWordCounts as value (value)}
					<button type="button" aria-pressed={keywordLimit.value === value} onclick={() => onLimitChange({ type: keywordLimit.type, value })}>{value}</button>
				{/each}
			</div>
		{:else}
			{#if mode === "snippets"}
				<div class="option-group" role="group" aria-label="Indentation">
					<button type="button" aria-pressed={autoTabs} onclick={() => (autoTabs = true)}>Auto Tabs</button>
					<button type="button" aria-pressed={!autoTabs} onclick={() => (autoTabs = false)}>Manual Tabs</button>
				</div>
			{:else}
				<div class="option-group" role="group" aria-label="Keyword modifiers">
					<button class="type-option" type="button" aria-pressed={modifiers.punctuation} onclick={() => onToggleModifier("punctuation")}><AtSvg /> Punctuation</button>
					<button class="type-option" type="button" aria-pressed={modifiers.numbers} onclick={() => onToggleModifier("numbers")}><HashSvg /> Numbers</button>
				</div>
			{/if}
			<div class="language-picker">
				<CodeSvg />
				<Dropdown compact label={mode === "snippets" ? "Snippet language" : "Keyword language"} value={langChoice} options={languageChoices.map(value => ({ value, label: languages[value] }))} onchange={onLanguageChange} />
			</div>
		{/if}
	</div>

<style>
	.code-options, .option-group, .language-picker { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-0_75rem); }
	.type-option { display: inline-flex; align-items: center; gap: var(--dimension-0_25rem); }
	.code-options { min-height: var(--dimension-3rem); padding: var(--dimension-0_75rem) var(--dimension-1rem); border-radius: var(--radius-0_5rem); font-weight: var(--weight-600); background: var(--surface); color: var(--muted); }
	.language-picker, [aria-pressed="true"] { color: var(--accent); }
	[aria-pressed="true"] { text-decoration: underline; text-underline-offset: var(--dimension-0_14em); }
	.presets, .language-picker { border-inline-start: var(--dimension-2px) solid var(--inset); padding-inline-start: var(--dimension-0_65rem); }
	.language-picker { gap: var(--dimension-0_3rem); }
	:global([data-theme="classic"]) :is(.code-options) {
		background: var(--accent);
		color: color-mix(in srgb, var(--accent-ink) 60%, var(--accent));
		color-scheme: dark;
	}
	:global([data-theme="classic"]) :is(.language-picker, .option-group [aria-pressed="true"]) {
		color: var(--accent-ink);
	}
	:global([data-theme="classic"]) :is(.presets, .language-picker) {
		border-color: color-mix(in srgb, var(--accent-ink) 80%, var(--accent));
	}
	:global([data-theme="classic"]) .code-options { --focus-highlight: var(--accent-ink); }
</style>
