<script lang="ts">
	let { kind }: { kind: "practice" | "race" } = $props();
</script>

<div class="result-detail-skeleton" aria-hidden="true">
	{#if kind === "race"}
		<div class="settings-placeholders">
			{#each Array.from({ length: 5 }, (_, index) => index) as index (index)}
				<div><span class="placeholder label"></span><span class="placeholder value"></span></div>
			{/each}
		</div>
	{/if}
	<div class="overview" class:practice={kind === "practice"}>
		{#if kind === "practice"}<div class="headline-placeholders">{#each [0, 1] as index (index)}<div><span class="placeholder label"></span><span class="placeholder score"></span></div>{/each}</div>{/if}
		<div class="chart-placeholder">
			<svg width="100%" height="212" viewBox="0 0 800 212" preserveAspectRatio="none">
				<rect x="49" y="12" width="735" height="161" rx="6" fill="var(--surface)" />
				<g fill="var(--accent-wash)">
					{#each [20, 85, 150] as y (y)}<rect x="22" {y} width="18" height="8" rx="4" />{/each}
					{#each [49, 390, 750] as x (x)}<rect {x} y="185" width="30" height="8" rx="4" />{/each}
				</g>
			</svg>
			<div class="legend-placeholders"><span class="placeholder"></span><span class="placeholder"></span></div>
		</div>
	</div>
	{#if kind === "practice"}
		<div class="metric-placeholders">{#each Array.from({ length: 5 }, (_, index) => index) as index (index)}<div><span class="placeholder label"></span><span class="placeholder value"></span></div>{/each}</div>
		<div class="word-placeholders"><span class="placeholder"></span><span class="placeholder"></span><span class="placeholder"></span></div>
	{/if}
</div>

<style>
	.result-detail-skeleton { min-width: 0; }
	.placeholder { display: block; height: var(--dimension-0_75rem); border-radius: var(--radius-99px); background: var(--accent-wash); }
	.label { width: var(--dimension-3rem); }
	.value { width: var(--dimension-5rem); height: var(--dimension-1_25rem); margin-top: var(--dimension-0_5rem); }
	.settings-placeholders, .metric-placeholders { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dimension-8rem)), 1fr)); gap: var(--dimension-1rem); }
	.settings-placeholders { border-block: var(--dimension-1px) solid var(--line); padding-block: var(--dimension-0_85rem); margin-bottom: var(--dimension-1_5rem); }
	.overview.practice { display: grid; grid-template-columns: minmax(var(--dimension-6rem), var(--dimension-9rem)) minmax(0, 1fr); gap: var(--dimension-0_75rem); }
	.headline-placeholders { display: grid; align-content: start; gap: var(--dimension-1rem); }
	.score { width: var(--dimension-5rem); height: var(--dimension-2_5rem); margin-top: var(--dimension-0_5rem); }
	.chart-placeholder { min-width: 0; }
	svg { display: block; }
	.legend-placeholders { display: flex; flex-wrap: wrap; gap: var(--dimension-1rem); padding-left: var(--dimension-3rem); }
	.legend-placeholders .placeholder { width: var(--dimension-6rem); }
	.metric-placeholders, .word-placeholders { margin-top: var(--dimension-2rem); }
	.word-placeholders { display: grid; gap: var(--dimension-0_75rem); }
	.word-placeholders .placeholder:nth-child(2) { width: 85%; }
	.word-placeholders .placeholder:last-child { width: 65%; }
	@media (max-width: 38rem) {
		.overview.practice { grid-template-columns: minmax(0, 1fr); }
		.headline-placeholders { display: flex; gap: var(--dimension-2rem); }
	}
	@media (prefers-reduced-motion: no-preference) {
		.result-detail-skeleton { animation: breathe var(--motion-1_2s) ease-in-out infinite alternate; }
	}
	@keyframes breathe { to { opacity: .4; } }
</style>
