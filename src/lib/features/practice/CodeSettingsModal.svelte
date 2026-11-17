<script lang="ts">
	import SettingsDialog from "../settings/SettingsDialog.svelte";
	import SettingsIcon from "../../components/icons/SettingsIcon.svelte";
	import CodeIcon from "../../components/icons/CodeIcon.svelte";
	import GlobeIcon from "../../components/icons/GlobeIcon.svelte";
	import ToolsIcon from "../../components/icons/ToolsIcon.svelte";
	import IndentIcon from "../../components/icons/IndentIcon.svelte";
	import AtIcon from "../../components/icons/AtIcon.svelte";
	import HashtagIcon from "../../components/icons/HashtagIcon.svelte";
	import TimerIcon from "../../components/icons/TimerIcon.svelte";
	import ArrowRightIcon from "../../components/icons/ArrowRightIcon.svelte";
	import { codeLanguages as languages, codeLanguageChoices as languageChoices, snippetLengths, type SnippetLength } from "../../../../shared/content/code-catalog";
	import { raceDurations, raceWordCounts } from "../../../../backend/src/race.settings";
	import type { KeywordLimit, KeywordModifiers } from "./code-keywords";

	let { open, mode, language, autoTabs = $bindable(true), limit, modifiers, snippetLength, onSnippetLengthChange,
		onClose, onFocusFallback, onModeChange, onLanguageChange, onLimitChange, onToggleModifier }: {
		snippetLength: SnippetLength;
		onSnippetLengthChange: (length: SnippetLength) => void;
		open: boolean;
		mode: "snippets" | "keywords";
		language: keyof typeof languages;
		autoTabs?: boolean;
		limit: KeywordLimit;
		modifiers: KeywordModifiers;
		onClose: () => void;
		onFocusFallback: () => void;
		onModeChange: (mode: "snippets" | "keywords") => void;
		onLanguageChange: (language: keyof typeof languages) => void;
		onLimitChange: (limit: KeywordLimit) => void;
		onToggleModifier: (modifier: keyof KeywordModifiers) => void;
	} = $props();

	const panels = {
		language: { title: "Language", icon: GlobeIcon },
		mode: { title: "Practice Mode", icon: CodeIcon },
		punctuation: { title: "Punctuations", icon: AtIcon },
		numbers: { title: "Numbers", icon: HashtagIcon },
		testType: { title: "Test Type", icon: ToolsIcon },
		length: { title: "Snippet length", icon: ToolsIcon },
		indentation: { title: "Indentation", icon: IndentIcon },
	};
	let selected = $state<keyof typeof panels | "main">("main");
	let panel = $derived(selected === "main" ? undefined : panels[selected]);
	let entries = $derived<(keyof typeof panels)[]>(mode === "keywords"
		? ["language", "punctuation", "numbers", "testType", "mode"]
		: ["language", "mode", "indentation", "length"]);

	$effect(() => {
		if (!open) selected = "main";
	});

	function back() { selected = "main"; }
</script>

<SettingsDialog {open} title={panel?.title ?? "Test Settings"} icon={panel?.icon ?? SettingsIcon}
	{onClose} {onFocusFallback} onBack={panel ? back : undefined}
>
	{#if selected === "main"}
		<div class="settings-list">
			{#each entries as key (key)}
				{@const item = panels[key]}
				<button tabindex="0" class="settings-choice" class:mobile-length={key === "length"} type="button" onclick={() => { selected = key; }}>
					<item.icon /><span>{item.title}</span><ArrowRightIcon />
				</button>
			{/each}
		</div>
	{:else if selected === "language"}
		<div class="settings-list" role="group" aria-label="Code language">
			{#each languageChoices as value (value)}
				<button tabindex="0" class="settings-choice" type="button" aria-pressed={language === value} onclick={() => onLanguageChange(value)}>{languages[value]}</button>
			{/each}
		</div>
	{:else if selected === "mode"}
		<div class="settings-list" role="group" aria-label="Practice mode">
			<button tabindex="0" class="settings-choice" type="button" aria-pressed={mode === "snippets"} onclick={() => onModeChange("snippets")}><CodeIcon /><span>Snippets</span></button>
			<button tabindex="0" class="settings-choice" type="button" aria-pressed={mode === "keywords"} onclick={() => onModeChange("keywords")}><span aria-hidden="true">Aa</span><span>Keywords</span></button>
		</div>
	{:else if selected === "length"}
		<div class="settings-list" role="group" aria-label="Snippet length">
			{#each snippetLengths as length (length)}
				<button tabindex="0" class="settings-choice" type="button" aria-pressed={snippetLength === length} onclick={() => onSnippetLengthChange(length)}>{length.charAt(0).toUpperCase() + length.slice(1)}</button>
			{/each}
		</div>
	{:else if selected === "indentation"}
		<div class="settings-list" role="group" aria-label="Indentation">
			<button tabindex="0" class="settings-choice" type="button" aria-pressed={autoTabs} onclick={() => { autoTabs = true; }}>Auto Tabs</button>
			<button tabindex="0" class="settings-choice" type="button" aria-pressed={!autoTabs} onclick={() => { autoTabs = false; }}>Manual Tabs</button>
		</div>
	{:else if selected === "testType"}
		<div class="settings-fields">
			<div class="settings-mode-options" role="group" aria-label="Keyword test type">
				<button tabindex="0" class="button button-secondary" type="button" aria-pressed={limit.type === "time"} onclick={() => { if (limit.type !== "time") onLimitChange({ type: "time", value: 30 }); }}><TimerIcon /> Timer</button>
				<button tabindex="0" class="button button-secondary" type="button" aria-pressed={limit.type === "words"} onclick={() => { if (limit.type !== "words") onLimitChange({ type: "words", value: 25 }); }}><span aria-hidden="true">Aa</span> Words</button>
			</div>
			<div class="settings-list" role="group" aria-label={limit.type === "time" ? "Duration in seconds" : "Word count"}>
				{#each limit.type === "time" ? raceDurations : raceWordCounts as value (value)}
					<button tabindex="0" class="settings-choice" type="button" aria-pressed={limit.value === value} onclick={() => onLimitChange({ type: limit.type, value })}>{value} {limit.type === "time" ? "seconds" : "words"}</button>
				{/each}
			</div>
		</div>
	{:else if selected === "numbers" || selected === "punctuation"}
		{@const modifier = selected}
		<div class="settings-list">
			{#each [false, true] as enabled (enabled)}
				<button tabindex="0" class="settings-choice" type="button" aria-pressed={modifiers[modifier] === enabled} onclick={() => { if (modifiers[modifier] !== enabled) onToggleModifier(modifier); }}>
					{enabled ? "On" : "None"}
				</button>
			{/each}
		</div>
	{/if}
</SettingsDialog>

<style>
	.mobile-length { display: none; }
	@media (max-width: 40rem) { .mobile-length { display: flex; } }
</style>
