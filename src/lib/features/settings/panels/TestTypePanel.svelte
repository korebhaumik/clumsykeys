<script lang="ts">
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

<div class="settings-fields">
	<div class="settings-mode-options" role="group" aria-label="Test type">
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "timer"} onclick={() => { if (selectedType !== "timer") updateTestConfigType("timer", 30); }}><TimerSvg /> Timer</button>
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "words"} onclick={() => { if (selectedType !== "words") updateTestConfigType("words", 50); }}><span aria-hidden="true">Aa</span> Words</button>
		<button class="button button-secondary" type="button" aria-pressed={selectedType === "quotes"} onclick={() => { if (selectedType !== "quotes") updateTestConfigType("quotes", "Random Quotes"); }}><QuotesSvg /> Quotes</button>
	</div>

	{#if selectedType === "quotes"}
		<p class="muted">Practice a randomly selected English quote.</p>
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
	.settings-limit-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--dimension-0_45rem) var(--dimension-0_75rem); }
	.settings-limit-form :is(input, button) { min-height: var(--settings-control-height); border-radius: var(--radius-0_75rem); }
	.settings-limit-form input { background: var(--surface); border-color: transparent; }
	.limit-hint { grid-column: 1 / -1; font-size: var(--text-0_8rem); }
</style>
