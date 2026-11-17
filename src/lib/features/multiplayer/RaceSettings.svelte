<script lang="ts">
	import type { Snippet } from "svelte";
	import Dropdown from "../../components/Dropdown.svelte";
	import { scrollFocus } from "../../components/scroll-focus";
	import TimerSvg from "../../components/icons/TimerIcon.svelte";
	import QuotesSvg from "../../components/icons/QuotesIcon.svelte";
	import AtSvg from "../../components/icons/AtIcon.svelte";
	import HashSvg from "../../components/icons/HashIcon.svelte";
	import LangSvg from "../../components/icons/LangIcon.svelte";
	import {
		raceDurations, raceLanguages, raceModes, raceWordCounts,
		type RaceSettings,
	} from "../../../../backend/src/race.settings";

	let { settings, onChange, disabled = false, actions }: {
		settings: RaceSettings;
		onChange?: (patch: Partial<RaceSettings>) => void;
		disabled?: boolean;
		actions?: Snippet;
	} = $props();

	let modeLabel = $derived(
		settings.mode === "time" ? `Time · ${settings.duration} s`
			: settings.mode === "words" ? `${settings.wordCount} words`
			: raceModes[settings.mode]
	);
</script>

{#if onChange}
	<fieldset class="lobby-settings" {disabled}>
		<legend class="panel-title">Race settings</legend>
		<p class="muted settings-intro">Choose what everyone will type.</p>
		<div class="settings-fields">
			<div class="field">
				<span>Test type</span>
				<Dropdown label="Test type" value={settings.mode} options={Object.entries(raceModes).map(([value, label]) => ({ value: value as RaceSettings["mode"], label }))} {disabled} onchange={(mode) => onChange?.({ mode })} />
			</div>
			{#if settings.mode === "time"}
				<div class="field">
					<span>Time limit</span>
					<Dropdown label="Time limit" value={settings.duration} options={raceDurations.map(value => ({ value, label: `${value} seconds` }))} {disabled} onchange={(duration) => onChange?.({ duration })} />
				</div>
			{:else if settings.mode === "words"}
				<div class="field">
					<span>Word count</span>
					<Dropdown label="Word count" value={settings.wordCount} options={raceWordCounts.map(value => ({ value, label: `${value} words` }))} {disabled} onchange={(wordCount) => onChange?.({ wordCount })} />
				</div>
			{/if}
			<div class="field">
				<span>Language</span>
				<Dropdown label="Language" value={settings.language} options={Object.entries(raceLanguages).map(([value, label]) => ({ value: value as RaceSettings["language"], label }))} {disabled} onchange={(language) => onChange?.({ language })} />
			</div>
		</div>
		<div class="settings-toggles">
			<label>
				Punctuation
				<input tabindex="0" type="checkbox" checked={settings.punctuation} onchange={(event) => onChange?.({ punctuation: event.currentTarget.checked })} />
			</label>
			<label>
				Numbers
				<input tabindex="0" type="checkbox" checked={settings.numbers} onchange={(event) => onChange?.({ numbers: event.currentTarget.checked })} />
			</label>
		</div>
		<p class="muted vote-note">Changing settings clears existing votes.</p>
	</fieldset>
{:else}
	<div class="race-settings-toolbar">
		<h2 class="settings-label">
			<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
				<path d="M6,22q-0.82,0-1.41-0.59T4,20V10Q4,9.17 4.59,8.59T6,8H7V6Q7,3.92 8.46,2.46T12,1t3.54,1.46T17,6V8h1q0.82,0 1.41,0.59T20,10V20q0,0.82-0.59,1.41T18,22H6Zm0-2H18V10H6V20Zm7.41-3.59Q14,15.83 14,15t-0.59-1.41T12,13t-1.41,0.59Q10,14.18 10,15t0.59,1.41T12,17t1.41-0.59ZM9,8h6V6q0-1.25-0.88-2.13T12,3T9.88,3.88T9,6V8ZM6,20V10V20Z"/>
			</svg>
			Race Settings
		</h2>
		{#if actions}
			<div class="toolbar-actions">{@render actions()}</div>
		{/if}
		<section class="race-settings-preview" aria-label="Race settings preview" tabindex="-1" use:scrollFocus>
			<span class="sr-only">Locked during the race</span>
			<dl class="preview-values">
				<div class="selected">
					<dt class="sr-only">Test type</dt>
					<dd>
						<span aria-hidden="true">
							{#if settings.mode === "time"}<TimerSvg />
							{:else if settings.mode === "quotes"}<QuotesSvg />
							{:else}<strong>Aa</strong>{/if}
						</span>
						{modeLabel}
					</dd>
				</div>
				<div class="preview-divider" class:selected={settings.punctuation}>
					<dt><span aria-hidden="true"><AtSvg /></span>Punctuation</dt>
					<dd>{settings.punctuation ? "On" : "Off"}</dd>
				</div>
				<div class:selected={settings.numbers}>
					<dt><span aria-hidden="true"><HashSvg /></span>Numbers</dt>
					<dd>{settings.numbers ? "On" : "Off"}</dd>
				</div>
				<div class="preview-divider selected">
					<dt class="sr-only">Language</dt>
					<dd><span aria-hidden="true"><LangSvg /></span>{raceLanguages[settings.language]}</dd>
				</div>
			</dl>
		</section>
	</div>
{/if}

<style>
	.lobby-settings { min-width: 0; color-scheme: dark; }
	:global([data-theme="classic"]) .lobby-settings { color-scheme: light; }
	.settings-intro { margin-block: var(--dimension-0_3rem) var(--dimension-1rem); font-size: var(--text-0_85rem); }
	.settings-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dimension-9rem)), 1fr)); gap: var(--dimension-0_75rem); }
	.settings-fields > :last-child:nth-child(3) { grid-column: 1 / -1; }
	.settings-toggles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dimension-8rem)), 1fr)); gap: var(--dimension-0_75rem); margin-top: var(--dimension-0_85rem); font-size: var(--text-0_875rem); }
	.settings-toggles label { display: flex; justify-content: space-between; align-items: center; gap: var(--dimension-0_45rem); min-height: var(--settings-control-height); padding-inline: var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); cursor: pointer; }
	.settings-toggles label:has(input:checked) { background: var(--accent-wash); }
	.settings-toggles input { flex: none; accent-color: var(--accent); cursor: inherit; }
	.vote-note { margin-top: var(--dimension-1rem); padding-top: var(--dimension-0_85rem); border-top: var(--dimension-1px) solid var(--line); font-size: var(--text-0_8rem); }
	.lobby-settings:disabled { opacity: .55; }
	.race-settings-toolbar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas: "label preview actions";
		align-items: center;
		gap: var(--dimension-0_75rem);
	}
	.race-settings-toolbar .settings-label { grid-area: label; justify-content: center; }
	.toolbar-actions { grid-area: actions; justify-self: end; }
	.race-settings-preview {
		grid-area: preview;
		position: relative;
		overflow-x: auto;
		white-space: nowrap;
		scrollbar-width: thin;
		scrollbar-color: var(--line) transparent;
	}
	.preview-values {
		--preview-accent: var(--typing-muted, var(--palette-stone-500));
		--preview-divider: var(--inset);
		display: flex;
		width: max-content;
		align-items: center;
		gap: var(--dimension-0_85rem);
		padding: var(--dimension-0_65rem) var(--dimension-1rem);
		min-height: var(--dimension-3rem);
		border-radius: var(--radius-0_5rem);
		background: var(--surface);
		color: var(--muted);
		font-size: var(--text-0_875rem);
		font-weight: var(--weight-600);
	}
	.preview-values :is(div, dt, dd) { display: flex; align-items: center; gap: var(--dimension-0_3rem); }
	.preview-values .selected { color: var(--preview-accent); }
	.preview-divider { padding-inline-start: var(--dimension-0_85rem); border-inline-start: var(--dimension-2px) solid var(--preview-divider); }
	:global([data-theme="classic"]) .preview-values {
		--preview-accent: var(--accent-ink);
		--preview-divider: var(--palette-gray-450);
		background: var(--accent);
		color: var(--palette-gray-450);
	}
	@media (max-width: 64rem) {
		.race-settings-toolbar {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: "label actions" "preview preview";
		}
		.race-settings-toolbar .settings-label { justify-self: start; }
	}
	@media (max-width: 40rem) {
		.race-settings-toolbar {
			grid-template-areas: "label actions";
			column-gap: var(--dimension-0_5rem);
		}
		.race-settings-preview { display: none; }
		.race-settings-toolbar .settings-label {
			padding-inline: var(--dimension-0_35rem);
			font-size: var(--text-0_8rem);
			white-space: nowrap;
		}
		.race-settings-toolbar .settings-label svg { flex: none; width: var(--dimension-1rem); height: var(--dimension-1rem); }
	}
</style>
