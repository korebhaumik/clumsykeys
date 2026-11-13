<script lang="ts">
	import { account } from "../../state/account.store";
	import { accountApi } from "../../services/account-api";
	import { retryPracticeResults } from "../practice/result-persistence";
	import type { Json, PracticeSummary, RaceResult } from "../../../../backend/src/persistence.contract";
	import type { PracticeResults as Stats } from "../practice/session";
	import PracticeResults from "../practice/PracticeResults.svelte";
	import ResultsChart from "../../components/charts/ResultsChart.svelte";
	let kind = $state<"practice" | "race">("practice");
	let rows = $state<(PracticeSummary | RaceResult)[]>([]);
	let nextOffset = $state<number | null>(null);
	let loading = $state(false);
	let error = $state("");
	let request = 0;
	let detail = $state<{ title: string; stats?: Stats; series?: { label: string; color: string; points: { seconds: number; wpm: number }[]; finishSeconds?: number }[] }>();
	let heading = $state<HTMLHeadingElement>()!;

	async function load(offset = 0) {
		const version = ++request;
		loading = true; error = "";
		try {
			const result = await accountApi<{ results: (PracticeSummary | RaceResult)[]; nextOffset: number | null }>(`/api/history?kind=${kind}&offset=${offset}`);
			if (version !== request) return;
			rows = offset ? [...rows, ...result.results] : result.results; nextOffset = result.nextOffset;
		} catch (cause) { if (version === request) error = cause instanceof Error ? cause.message : "Could not load history."; }
		finally { if (version === request) loading = false; }
	}
	$effect(() => {
		const id = $account.session?.user.id;
		const selected = kind;
		rows = []; detail = undefined; nextOffset = null;
		if (id && selected) void load();
		return () => { request++; };
	});
	async function open(row: PracticeSummary | RaceResult) {
		const version = ++request;
		loading = true; error = "";
		try {
			if ("id" in row) {
				const result = await accountApi<{ summary: PracticeSummary; samples: Stats["samples"]; history: Stats["history"] }>(`/api/practice-results/${row.id}`);
				if (version !== request) return;
				const s = result.summary;
				detail = { title: `${s.mode} · ${s.language}`, stats: { correct: s.correct, incorrect: s.incorrect, extra: s.extra,
					elapsedSeconds: s.elapsed_seconds, wpm: s.wpm, raw: s.raw, accuracy: s.accuracy, deviation: s.deviation,
					samples: result.samples, history: result.history } };
			} else {
				const result = await accountApi<{ round: { room_id: string }; results: { username: string; speed_history: Json; finish_seconds: number | null }[] }>(`/api/race-results/${row.round_id}`);
				if (version !== request) return;
				const colors = ["var(--result-accent)", "var(--racer-blue)", "var(--racer-orange)", "var(--racer-violet)", "var(--racer-pink)", "var(--racer-teal)"];
				detail = { title: `Race · ${result.round.room_id}`, series: result.results.map((racer, index) => ({ label: racer.username,
					color: colors[index % colors.length], points: racer.speed_history as { seconds: number; wpm: number }[], finishSeconds: racer.finish_seconds ?? undefined })) };
			}
		} catch (cause) { if (version === request) error = cause instanceof Error ? cause.message : "Could not load result."; }
		finally { if (version === request) loading = false; }
	}
	function close() { detail = undefined; heading?.focus(); }
</script>

<section class="stack" aria-labelledby="history-title">
	<div class="page-heading"><p class="eyebrow">Your typing journey</p><h1 id="history-title" tabindex="-1" bind:this={heading}>Your history.</h1><p class="lede">Your saved practice sessions and multiplayer races.</p></div>
	{#if !$account.session}
		<div class="panel stack"><p>Sign in to see your saved results. Guest activity stays on this device.</p><a class="button button-primary" href="#/account">Sign in</a></div>
	{:else}
		<div class="history-actions" role="group" aria-label="History type">
			<button class="button button-secondary" aria-pressed={kind === "practice"} onclick={() => { kind = "practice"; }}>Practice history</button>
			<button class="button button-secondary" aria-pressed={kind === "race"} onclick={() => { kind = "race"; }}>Race history</button>
			<button class="button button-secondary" disabled={loading} onclick={async () => { await retryPracticeResults(); await load(); }}>Refresh history</button>
		</div>
		{#if error}<p role="alert">{error}</p>{/if}
		{#if loading}<p role="status">Loading results…</p>{/if}
		{#if detail}
			<div class="panel stack"><h2 class="panel-title">{detail.title}</h2><button class="button button-secondary" onclick={close}>Back to history</button>
				{#if detail.stats}<PracticeResults stats={detail.stats} testType={detail.title} onRestart={close} showRestart={false} />{:else if detail.series}<ResultsChart series={detail.series} />{/if}
			</div>
		{:else if rows.length}
			<ol class="history-list">
				{#each rows as row}
					<li><button class="history-row" onclick={() => open(row)} disabled={loading}>
						<span>{"id" in row ? `${row.mode} · ${row.language}` : `Multiplayer · ${row.reason}`}</span>
						<span>{row.wpm} WPM · {row.accuracy}%</span><time datetime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
					</button></li>
				{/each}
			</ol>
			{#if nextOffset !== null}<button class="button button-secondary" disabled={loading} onclick={() => load(nextOffset!)}>Load more results</button>{/if}
		{:else if !loading && !error}<p>No saved results yet. <a href="#/">Start practising</a>.</p>{/if}
	{/if}
</section>

<style>
	.history-actions { display: flex; flex-wrap: wrap; gap: var(--dimension-0_55rem); }
	.history-list { display: grid; gap: var(--dimension-0_55rem); list-style: none; padding: 0; }
	.history-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; width: 100%; text-align: left; gap: var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); background: var(--surface); padding: var(--dimension-1rem); border-radius: var(--radius-0_55rem); }
	.history-row:hover { background: var(--accent-wash); }
	time { font-size: var(--text-0_82rem); color: var(--muted); }
	[role="alert"] { color: var(--error); }
</style>
