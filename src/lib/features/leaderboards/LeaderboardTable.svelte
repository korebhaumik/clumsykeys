<script lang="ts">
	import type { Snippet } from "svelte";
	import { languageOptions, type RankedScore } from "./leaderboard";
	let { rows, loading, currentUserId, children }: {
		rows: RankedScore[]; loading: boolean; currentUserId: string | null; children: Snippet;
	} = $props();
	const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
	const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The overflow table must be scrollable using the keyboard.) -->
<div class="table-scroll" class:empty={!loading && !rows.length} role="region" aria-label="Solo rankings, scroll for more columns" tabindex="0" aria-busy={loading}>
	{#if !loading && !rows.length}
		<div class="table-state">{@render children()}</div>
	{:else}
	<table>
		<caption class="sr-only">Solo typing leaderboard. One best score per player. Ties use accuracy, then earliest result.</caption>
		<thead><tr><th scope="col">rank</th><th scope="col">player</th><th scope="col">wpm</th><th scope="col">wpm (raw)</th><th scope="col">accuracy</th><th scope="col"><abbr title="WPM standard deviation">wpm std</abbr></th><th scope="col"><abbr title="Characters: correct / incorrect / extra">chars¹</abbr></th><th scope="col">language</th><th scope="col">date</th></tr></thead>
		<tbody>
			{#if loading}
				{#each Array.from({ length: 10 }, (_, index) => index) as index (index)}
					<tr aria-hidden="true" class="skeleton-row">{#each Array.from({ length: 9 }, (_, index) => index) as column (column)}<td><span class="skeleton" class:short={column === 0}></span></td>{/each}</tr>
				{/each}
			{:else if rows.length}
				{#each rows as row (row.id)}
					<tr class:own={row.userId === currentUserId} aria-current={row.userId === currentUserId ? "true" : undefined}>
						<td><span class="rank" class:podium={row.rank <= 3} aria-label={`Rank ${row.rank}`}>{row.rank <= 3 ? "✦ " : ""}{row.rank}</span></td>
						<th scope="row" class="player">{row.username}{#if row.userId === currentUserId}<span class="you">you</span>{/if}</th>
						<td>{number(row.wpm)}</td><td>{number(row.raw)}</td><td>{number(row.accuracy)}%</td><td>{number(row.deviation)}</td><td>{row.correct}/{row.incorrect}/{row.extra}</td>
						<td>{languageOptions(row.mode).find(option => option.value === row.language)?.label}</td><td><time datetime={row.date}>{date(row.date)}</time></td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
	{/if}
</div>
{#if loading || rows.length}<p class="character-note">¹ Characters: correct / incorrect / extra.</p>{/if}

<style>
	.table-scroll { overflow-x: auto; min-height: calc(var(--dimension-3_5rem) * 11); }
	.table-scroll.empty { min-height: 0; }
	table { width: 100%; min-width: var(--dimension-60rem); border-collapse: collapse; text-align: left; font-size: var(--text-0_82rem); font-variant-numeric: tabular-nums; white-space: nowrap; }
	tr { height: var(--dimension-3_5rem); }
	th, td { padding: var(--dimension-0_75rem) var(--dimension-0_65rem); }
	thead th { color: var(--muted); font-weight: var(--weight-400); }
	tbody tr:nth-child(even) { background: var(--surface); }
	abbr { text-decoration: none; }
	.player { font-weight: var(--weight-400); }
	.rank { color: var(--muted); }
	.podium { color: var(--accent); font-weight: var(--weight-700); }
	tbody tr.own { background: var(--accent-wash); box-shadow: inset var(--dimension-3px) 0 var(--accent); }
	.you { display: inline-block; margin-left: var(--dimension-0_5rem); font: var(--text-0_72rem) var(--mono); color: var(--accent); }
	.table-state { padding: var(--dimension-1_5rem) 0 var(--dimension-0_75rem); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: var(--dimension-1rem); white-space: normal; text-align: center; width: 100%; margin-inline: auto; }
	.character-note { margin-top: var(--dimension-0_75rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.skeleton { display: block; height: var(--dimension-0_75rem); width: 75%; border-radius: var(--radius-99px); background: var(--accent-wash); }
	.short { width: var(--dimension-1_25rem); }
	@media (prefers-reduced-motion: no-preference) {
		.skeleton { animation: breathe var(--motion-1_2s) ease-in-out infinite alternate; }
		@keyframes breathe { to { opacity: 0.4; } }
	}
</style>
