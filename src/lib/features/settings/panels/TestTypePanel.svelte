<script lang="ts">
	import QuoteLengthOptions from "../selectors/QuoteLengthOptions.svelte";
	import QuotesSvg from "../../../components/icons/QuotesIcon.svelte";
	import TimerSvg from "../../../components/icons/TimerIcon.svelte";
	import { testConfig, updateTestConfigType } from "../settings.store";

	let selectedType = $derived<"quotes" | "words" | "timer">(
		$testConfig.quotes ? "quotes" : $testConfig.words !== null ? "words" : "timer"
	);
	let minimum = $derived(selectedType === "timer" ? 5 : 10);
	let customLimit = $state<number>();

	$effect(() => {
		customLimit = $testConfig.timer ?? $testConfig.words ?? undefined;
	});

	function setLimit(event: Event) {
		event.preventDefault();
		if (selectedType === "quotes" || customLimit === undefined ||
			!Number.isInteger(customLimit) || customLimit < minimum || customLimit > 1000) return;
		updateTestConfigType(selectedType, customLimit);
	}
</script>

<div class="settings-fields test-type-fields">
	<div class="settings-mode-options test-type-options" role="group" aria-label="Test type">
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "timer"} onclick={() => { if (selectedType !== "timer") updateTestConfigType("timer", 30); }}><TimerSvg /> Timer</button>
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "words"} onclick={() => { if (selectedType !== "words") updateTestConfigType("words", 50); }}><span aria-hidden="true">Aa</span> Words</button>
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "quotes"} onclick={() => { if (selectedType !== "quotes") updateTestConfigType("quotes", "Random Quotes"); }}><QuotesSvg /> Quotes</button>
	</div>

	{#if selectedType === "quotes"}
		<section class="quote-length-section" aria-labelledby="quote-length-heading">
			<div class="quote-length-intro">
				<h3 id="quote-length-heading">Quote length</h3>
				<p class="muted">Practice a complete English quote.</p>
			</div>
			<QuoteLengthOptions panel />
		</section>
	{:else}
		<form class="settings-limit-form" onsubmit={setLimit}>
			<label class="field">
				{selectedType === "timer" ? "Seconds" : "Word count"}
				<input type="number" min={minimum} max={1000} required bind:value={customLimit} aria-describedby="limit-hint" />
			</label>
			<button class="button button-primary" type="submit">Set {selectedType}</button>
			<p class="muted limit-hint" id="limit-hint">{minimum}–1,000 {selectedType === "timer" ? "seconds" : "words"}</p>
		</form>
	{/if}
</div>

<style>
	.test-type-fields { gap: var(--dimension-1_5rem); }
	.test-type-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.test-type-options button { min-width: 0; min-height: var(--settings-control-height); padding-inline: var(--dimension-0_5rem); gap: var(--dimension-0_35rem); }
	.quote-length-section { display: grid; gap: var(--dimension-0_75rem); }
	.quote-length-intro { display: grid; gap: var(--dimension-0_35rem); }
	.quote-length-intro h3 { font-size: var(--text-0_9rem); font-weight: var(--weight-600); }
	.quote-length-intro p { font-size: var(--text-0_8rem); }
	.settings-limit-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--dimension-0_45rem) var(--dimension-0_75rem); }
	.settings-limit-form :is(input, button) { min-height: var(--settings-control-height); border-radius: var(--radius-0_75rem); }
	.settings-limit-form input { background: var(--surface); border-color: transparent; }
	.limit-hint { grid-column: 1 / -1; font-size: var(--text-0_8rem); }
	@media (max-width: 400px) {
		.test-type-options button { flex-direction: column; padding-block: var(--dimension-0_65rem); }
		.test-type-options button > span { display: grid; place-items: center; min-height: var(--dimension-1_5rem); }
	}
</style>
