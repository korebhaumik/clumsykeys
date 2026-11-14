<script lang="ts">
	import { quoteLengths } from "../../../../../shared/content/quote-length";
	import { testConfig, updateQuoteLength } from "../settings.store";
	let { panel = false }: { panel?: boolean } = $props();
	const id = $props.id();
	const ranges = { short: "Up to 100 characters", medium: "101–300 characters", long: "Over 300 characters" };
</script>

<div class:quote-length-cards={panel} class="quote-length-options" role="group" aria-label="Quote length">
	{#each quoteLengths as length (length)}
		<button type="button" class={panel ? "length-card" : "toolbar-option"}
			aria-label={length.charAt(0).toUpperCase() + length.slice(1)}
			aria-describedby={panel ? `${id}-${length}-range` : undefined}
			aria-pressed={($testConfig.quoteLength ?? "medium") === length}
			onclick={() => updateQuoteLength(length)}>
			{#if panel}
				<span class="card-copy">
					<span class="card-title">{length.charAt(0).toUpperCase() + length.slice(1)}</span>
					<small id={`${id}-${length}-range`}>{ranges[length]}</small>
				</span>
				<span class="selection-mark" aria-hidden="true"></span>
			{:else}
				{length.charAt(0).toUpperCase() + length.slice(1)}
			{/if}
		</button>
	{/each}
</div>

<style>
	.quote-length-options { display: flex; flex-wrap: wrap; gap: var(--dimension-0_75rem); }
	.quote-length-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--dimension-0_55rem); }
	.length-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--dimension-0_5rem); padding: var(--dimension-0_9rem) var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_75rem); background: var(--surface); color: var(--muted); text-align: start; cursor: pointer; }
	.length-card:hover { border-color: var(--accent); }
	.length-card[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-wash); color: var(--accent); }
	.card-copy { display: grid; gap: var(--dimension-0_5rem); }
	.card-title { color: var(--ink); font-size: var(--text-0_9rem); font-weight: var(--weight-600); }
	[aria-pressed="true"] .card-title { color: var(--accent); }
	.card-copy small { font-size: var(--text-0_75rem); line-height: var(--leading-1_5); color: var(--muted); }
	.selection-mark { display: grid; place-items: center; width: var(--dimension-1rem); height: var(--dimension-1rem); margin-top: var(--dimension-0_15rem); border: var(--dimension-1px) solid currentColor; border-radius: var(--radius-99px); }
	.selection-mark::after { content: ""; width: var(--dimension-0_4rem); height: var(--dimension-0_4rem); border-radius: var(--radius-99px); background: currentColor; visibility: hidden; }
	[aria-pressed="true"] .selection-mark::after { visibility: visible; }
	@media (max-width: 400px) {
		.quote-length-cards { grid-template-columns: minmax(0, 1fr); }
		.length-card { align-items: center; padding-block: var(--dimension-0_75rem); }
		.card-copy { gap: var(--dimension-0_25rem); }
		.selection-mark { margin-top: 0; }
	}
	.toolbar-option[aria-pressed="true"] { color: var(--accent); text-decoration: underline; text-underline-offset: var(--dimension-0_14em); }
	:global([data-theme="classic"]) .toolbar-option[aria-pressed="true"] { color: var(--accent-ink); }
</style>
