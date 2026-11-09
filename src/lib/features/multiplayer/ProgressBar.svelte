<script lang="ts">
	let { value = 0, max = 100, userName, local = false }: {
		value?: number;
		max?: number;
		userName: string;
		local?: boolean;
	} = $props();

	let percentage = $derived(max > 0 ? Math.min(100, Math.max(0, value / max * 100)) : 0);
</script>

<div class="progress-row" class:local>
	<span class="racer" title={userName}>{userName}</span>
	<div class="track" role="progressbar" aria-label={`${userName} progress`} aria-valuenow={Math.round(percentage)}>
		<div class="fill" style="width: {percentage}%"></div>
	</div>
	<span class="percentage" aria-hidden="true">{Math.round(percentage)}%</span>
</div>

<style>
	.progress-row { display: grid; grid-template-columns: clamp(var(--dimension-5rem), 16%, var(--dimension-9rem)) minmax(0, 1fr) var(--dimension-3_25rem); align-items: center; gap: clamp(var(--dimension-0_55rem), var(--dimension-1_6vw), var(--dimension-1_25rem)); color: var(--muted); }
	.racer { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: clamp(var(--text-0_83rem), var(--text-1_5vw), var(--text-1_12rem)); }
	.track { height: var(--dimension-0_85rem); border-radius: var(--radius-2px); background: var(--surface); }
	.fill { background: currentColor; border-radius: inherit; height: 100%; transition: width var(--motion-180ms) ease; }
	.percentage { font-size: var(--text-0_875rem); text-align: end; font-variant-numeric: tabular-nums; }
	.local { color: var(--accent); }
	@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
</style>
