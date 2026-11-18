<script lang="ts">
	import { tick, untrack } from "svelte";
	import { account } from "../../state/account.store";
	import { accountApi } from "../../services/account-api";
	import type { Json, PracticeSummary } from "../../../../backend/src/persistence.contract";
	import type { PracticeResults as Stats } from "../practice/session";
	import PracticeResults from "../practice/PracticeResults.svelte";
	import ResultDetailSkeleton from "./ResultDetailSkeleton.svelte";
	import ResultsChart from "../../components/charts/ResultsChart.svelte";
	import Dropdown from "../../components/Dropdown.svelte";
	import { scrollFocus } from "../../components/scroll-focus";
	import ArrowRightIcon from "../../components/icons/ArrowRightIcon.svelte";
	import { practiceModes, testLanguage } from "../auth/dashboard";
	import { historyCsv, modeLabel, resultKey, savedRaceSettings, selectHistory, type SavedRaceSetting, type HistoryRow, type SortKey } from "./history";

	let kind = $state<"practice" | "race">("practice");
	let rows = $state<HistoryRow[]>([]);
	let nextOffset = $state<number | null>(null);
	let loading = $state(false);
	let opening = $state(false);
	let error = $state("");
	let detailError = $state("");
	let failedOffset = $state(0);
	let request = 0;
	let detailRequest = 0;
	let mode = $state("");
	let language = $state("");
	let days = $state(0);
	let sort = $state<SortKey>("created_at");
	let ascending = $state(false);
	let detail = $state<{ title: string; date: string; raceSettings?: SavedRaceSetting[]; stats?: Stats; series?: { label: string; color: string; points: { seconds: number; wpm: number }[]; finishSeconds?: number }[] }>();
	let detailHeading = $state<HTMLHeadingElement>();
	let opener: HTMLButtonElement | undefined;
	let selectedRow: HistoryRow | undefined;
	const visible = $derived(selectHistory(rows, { mode, language, days }, sort, ascending));
	const languages = $derived([...new Set(rows.flatMap(row => "id" in row ? [row.language] : []))].sort().map(value => ({ value, label: testLanguage(value) })));
	const averageWpm = $derived(visible.length ? Math.round(visible.reduce((sum, row) => sum + row.wpm, 0) / visible.length) : null);
	const bestWpm = $derived(visible.length ? Math.max(...visible.map(row => row.wpm)) : null);
	const averageAccuracy = $derived(visible.length ? (visible.reduce((sum, row) => sum + row.accuracy, 0) / visible.length).toFixed(1) : null);
	const initialLoading = $derived(loading && !rows.length);
	const loadingMore = $derived(loading && failedOffset > 0);
	const filtered = $derived(!!mode || !!language || !!days);
	const date = (value: string) => new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
	const metricColumns: { key: SortKey; label: string; title: string }[] = [
		{ key: "wpm", label: "wpm", title: "Words per minute" },
		{ key: "raw", label: "raw", title: "Raw words per minute" },
		{ key: "accuracy", label: "accuracy", title: "Accuracy" },
		{ key: "deviation", label: "wpm std", title: "WPM standard deviation: lower means steadier speed" },
	];

	async function load(offset = 0) {
		const version = ++request;
		loading = true; error = ""; failedOffset = offset;
		try {
			const result = await accountApi<{ results: HistoryRow[]; nextOffset: number | null }>(`/api/history?kind=${kind}&offset=${offset}`);
			if (version !== request) return;
			rows = offset ? [...rows, ...result.results] : result.results;
			nextOffset = result.nextOffset;
		} catch (cause) { if (version === request) error = cause instanceof Error ? cause.message : "Could not load history."; }
		finally { if (version === request) loading = false; }
	}
	$effect(() => {
		const id = $account.session?.user.id;
		void kind;
		rows = []; detail = undefined; selectedRow = undefined; nextOffset = null; error = ""; detailError = ""; opening = false; loading = false;
		mode = ""; language = ""; days = 0; sort = "created_at"; ascending = false;
		if (id) untrack(() => void load());
		return () => { request++; detailRequest++; };
	});
	async function open(row: HistoryRow, button: HTMLButtonElement) {
		const version = ++detailRequest;
		opener = button; selectedRow = row; opening = true; detailError = "";
		detail = { title: "id" in row ? `${modeLabel(row)} · ${testLanguage(row.language)}` : "Race results", date: row.created_at };
		await tick();
		if (version !== detailRequest) return;
		detailHeading?.focus();
		try {
			if ("id" in row) {
				const result = await accountApi<{ summary: PracticeSummary; samples: Stats["samples"]; history: Stats["history"] }>(`/api/practice-results/${row.id}`);
				if (version !== detailRequest) return;
				const s = result.summary;
				detail = { title: `${modeLabel(s)} · ${testLanguage(s.language)}`, date: s.created_at, stats: { correct: s.correct, incorrect: s.incorrect, extra: s.extra,
					elapsedSeconds: s.elapsed_seconds, wpm: s.wpm, raw: s.raw, accuracy: s.accuracy, deviation: s.deviation,
					samples: result.samples, history: result.history } };
			} else {
				const result = await accountApi<{ round: { room_id: string; settings?: Json }; results: { username: string; speed_history: Json; finish_seconds: number | null }[] }>(`/api/race-results/${row.round_id}`);
				if (version !== detailRequest) return;
				const colors = ["var(--result-accent)", "var(--racer-blue)", "var(--racer-orange)", "var(--racer-violet)", "var(--racer-pink)", "var(--racer-teal)"];
				detail = { title: `Race · ${result.round.room_id}`, date: row.created_at, raceSettings: savedRaceSettings(result.round.settings), series: result.results.map((racer, index) => ({ label: racer.username,
					color: colors[index % colors.length], points: racer.speed_history as { seconds: number; wpm: number }[], finishSeconds: racer.finish_seconds ?? undefined })) };
				await tick(); detailHeading?.focus();
			}
		} catch (cause) { if (version === detailRequest) detailError = cause instanceof Error ? cause.message : "Could not load result."; }
		finally { if (version === detailRequest) opening = false; }
	}
	async function close() { detailRequest++; opening = false; detail = undefined; detailError = ""; selectedRow = undefined; await tick(); opener?.focus(); }
	function retryDetail() { if (selectedRow && opener) void open(selectedRow, opener); }
	function order(key: SortKey) { ascending = sort === key ? !ascending : false; sort = key; }
	function clearFilters() { mode = ""; language = ""; days = 0; }
	function download() {
		const url = URL.createObjectURL(new window.Blob([historyCsv(visible)], { type: "text/csv;charset=utf-8" }));
		const anchor = document.createElement("a");
		anchor.href = url; anchor.download = `clumsy-keys-${kind}-history.csv`; anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}
</script>

<section class="history-page" aria-labelledby="history-title">
	<h1 id="history-title" class="sr-only">History</h1>
	{#if !$account.session}
		<div class="panel stack"><h2 class="panel-title">Your progress, in one place.</h2><p>Sign in to see your saved results. Guest tests aren’t saved to your account.</p><a tabindex="0" class="button button-primary" href="#/account">Sign in</a></div>
	{:else}
		<div class="history-navigation">
			<div class="history-tabs" role="group" aria-label="History type">
				<button tabindex="0" aria-label="Practice history" aria-pressed={kind === "practice"} onclick={() => kind = "practice"}>Practice</button>
				<button tabindex="0" aria-label="Race history" aria-pressed={kind === "race"} onclick={() => kind = "race"}>Multiplayer</button>
			</div>
			{#if detail}<button tabindex="0" class="back-button" onclick={close}>← Back to history</button>{/if}
		</div>
		<div hidden={!!detail} class="history-listing">
			<div class="history-filters" aria-label="Filter loaded results">
				{#if kind === "practice"}
					<div class="filter"><span>Mode</span><Dropdown label="History mode" disabled={initialLoading} value={mode} options={[{ value: "", label: "All modes" }, ...practiceModes]} onchange={value => mode = value} /></div>
					<div class="filter"><span>Language</span><Dropdown label="History language" disabled={initialLoading} value={language} options={[{ value: "", label: "All languages" }, ...languages]} onchange={value => language = value} /></div>
				{/if}
				<div class="filter"><span>Period</span><Dropdown label="History period" disabled={initialLoading} value={days} options={[{ value: 0, label: "All time" }, { value: 7, label: "Last 7 days" }, { value: 30, label: "Last 30 days" }, { value: 90, label: "Last 90 days" }]} onchange={value => days = value} /></div>
				<div class="filter-actions">{#if filtered}<button tabindex="0" onclick={clearFilters}>Clear filters</button>{/if}<button tabindex="0" disabled={!visible.length || loading} onclick={download}>Export CSV ↓</button></div>
			</div>
			<div class="history-summary" aria-label="Summary of matching loaded results" aria-busy={loading}>
				<p role="status">{loading ? "Loading results…" : `${visible.length} ${filtered ? "matching" : "saved"} ${visible.length === 1 ? "test" : "tests"}`}{#if nextOffset !== null}<span> · more available</span>{/if}</p>
				<dl><div><dt>best</dt><dd>{#if initialLoading}<span class="skeleton summary-placeholder" aria-hidden="true"></span>{:else}{bestWpm ?? "—"}<small> wpm</small>{/if}</dd></div><div><dt>average</dt><dd>{#if initialLoading}<span class="skeleton summary-placeholder" aria-hidden="true"></span>{:else}{averageWpm ?? "—"}<small> wpm</small>{/if}</dd></div><div><dt>accuracy</dt><dd>{#if initialLoading}<span class="skeleton summary-placeholder" aria-hidden="true"></span>{:else}{averageAccuracy ?? "—"}<small>%</small>{/if}</dd></div></dl>
			</div>
			{#if error}<div class="error-message" role="alert">{error}{#if rows.length} Showing previously loaded results.{/if} <button tabindex="0" disabled={loading} onclick={() => load(failedOffset)}>Retry history</button></div>{/if}
			{#if rows.length || loading}
				<p class="scroll-hint">Scroll to see all columns →</p>
				<div class="history-table-scroll" role="region" aria-label="Saved results, scroll for more columns" tabindex="-1" use:scrollFocus aria-busy={loading}>
					<table class:race-table={kind === "race"}>
						<caption class="sr-only">Saved {kind === "practice" ? "practice tests" : "multiplayer races"}. Sort using column headings, or open a result for details.</caption>
						<thead><tr>
							{#each metricColumns.filter(column => kind === "practice" || column.key === "wpm" || column.key === "accuracy") as column}
								<th scope="col" aria-sort={sort === column.key ? ascending ? "ascending" : "descending" : "none"}><button tabindex="0" disabled={initialLoading} onclick={() => order(column.key)} title={column.title}>{column.label}<span aria-hidden="true" class:active-sort={sort === column.key}>{sort === column.key ? ascending ? "↑" : "↓" : "↕"}</span></button></th>
							{/each}
							<th scope="col"><abbr title={kind === "practice" ? "Correct / incorrect / extra characters" : "Total characters typed"}>chars</abbr></th><th scope="col">{kind === "practice" ? "mode" : "result"}</th>
							{#if kind === "practice"}<th scope="col">language</th>{/if}
							<th scope="col" aria-sort={sort === "created_at" ? ascending ? "ascending" : "descending" : "none"}><button tabindex="0" disabled={initialLoading} onclick={() => order("created_at")}>date <span aria-hidden="true" class:active-sort={sort === "created_at"}>{sort === "created_at" ? ascending ? "↑" : "↓" : "↕"}</span></button></th><th scope="col"><span class="sr-only">Details</span></th>
						</tr></thead>
						<tbody>
							{#each visible as row (resultKey(row))}
								<tr><td class="wpm">{row.wpm}</td>
									{#if "id" in row}<td>{row.raw}</td>{/if}<td>{row.accuracy.toFixed(1)}%</td>
									{#if "id" in row}<td>{Number(row.deviation.toFixed(2))}</td><td aria-label={`${row.correct} correct, ${row.incorrect} incorrect, ${row.extra} extra`}>{row.correct}<span class="separator">/</span>{row.incorrect}<span class="separator">/</span>{row.extra}</td><td class="mode-cell">{modeLabel(row)}</td><td>{testLanguage(row.language)}</td>
									{:else}<td>{row.typed_chars}</td><td>{row.reason === "completed" ? "Completed" : row.reason === "time-limit" ? "Time limit" : row.reason === "error-limit" ? "Over error limit" : "Disconnected"}</td>{/if}
									<td><time datetime={row.created_at}>{date(row.created_at)}</time></td>
									<td><button tabindex="0" class="history-row" aria-label={`View ${modeLabel(row)} result from ${date(row.created_at)}`} title="View result details" disabled={opening || loading} onclick={event => open(row, event.currentTarget)}><ArrowRightIcon /></button></td>
								</tr>
							{/each}
							{#if initialLoading || loadingMore}
								{#each Array.from({ length: initialLoading ? 5 : 3 }, (_, index) => index) as index (index)}
									<tr class="skeleton-row" aria-hidden="true">{#each Array.from({ length: kind === "practice" ? 9 : 6 }, (_, column) => column) as column (column)}<td><span class="skeleton table-placeholder"></span></td>{/each}</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			{/if}
			{#if !visible.length && !loading && !error}
				<div class="empty-history"><h2>{filtered ? "No matching tests." : "No saved results yet."}</h2><p>{filtered ? "Try another filter, or load more results below." : kind === "practice" ? "Finish a practice test to start building your history." : "Your saved multiplayer races will appear here."}</p>{#if filtered}<button tabindex="0" class="button button-secondary" onclick={clearFilters}>Clear filters</button>{:else}<a tabindex="0" class="button button-primary" href={kind === "practice" ? "#/" : "#/login"}>{kind === "practice" ? "Start practising" : "Join a race"} <ArrowRightIcon /></a>{/if}</div>
			{/if}
			<footer class="history-footer"><p>Filters, summaries and export use loaded results.{#if kind === "practice"}<br />chars = correct / incorrect / extra · wpm std = speed variation{/if}</p>{#if nextOffset !== null}<button tabindex="0" class="button button-secondary" disabled={loading || opening} onclick={() => load(nextOffset!)}>Load more results</button>{/if}</footer>
		</div>
		{#if detail}
			<section class="detail-view" aria-label="Result details" aria-busy={opening}><div class="detail-heading"><h2 bind:this={detailHeading} tabindex="-1">{detail.title}</h2><time datetime={detail.date}>{date(detail.date)}</time></div>
				{#if opening}
					<p class="loading-detail" role="status">Loading result…</p>
					<ResultDetailSkeleton {kind} />
				{:else if detailError}
					<div class="detail-error"><p class="error-message" role="alert">{detailError}</p><button tabindex="0" class="button button-secondary" onclick={retryDetail}>Retry result</button></div>
				{:else}
				{#if detail.series}
					<section class="saved-race-settings" aria-label="Race settings">
						{#if detail.raceSettings?.length}
							<dl>{#each detail.raceSettings as setting (setting.label)}<div><dt>{setting.label}</dt><dd>{setting.value}</dd></div>{/each}</dl>
						{:else}<p>Settings unavailable for this saved race.</p>{/if}
					</section>
				{/if}
				{#if detail.stats}<PracticeResults stats={detail.stats} testType={detail.title} onRestart={close} showRestart={false} />{:else if detail.series}<ResultsChart series={detail.series} />{/if}
				{/if}
			</section>
		{/if}
	{/if}
</section>

<style>
	.history-page { width: 100%; min-width: 0; color: var(--ink); }
	.history-navigation, .history-summary, .history-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--dimension-1rem); }
	.history-navigation { border-bottom: var(--dimension-1px) solid var(--line); margin-bottom: var(--dimension-1_25rem); }
	.history-tabs { display: flex; gap: var(--dimension-1_5rem); }
	.history-tabs button { padding: var(--dimension-0_75rem) 0; border-bottom: var(--dimension-3px) solid transparent; color: var(--muted); font-size: var(--text-0_9rem); font-weight: var(--weight-600); }
	.history-tabs [aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
	.history-listing[hidden] { display: none; }
	.history-filters { display: flex; flex-wrap: wrap; align-items: end; gap: var(--dimension-0_75rem); }
	.filter { display: grid; gap: var(--dimension-0_35rem); flex: 1; min-width: var(--dimension-9rem); max-width: var(--dimension-11rem); font-size: var(--text-0_82rem); }
	.filter > span { color: var(--muted); font-size: var(--text-0_75rem); }
	.filter-actions { display: flex; flex-wrap: wrap; gap: var(--dimension-1rem); margin-left: auto; }
	.filter-actions button { padding-block: var(--dimension-0_75rem); font-size: var(--text-0_75rem); color: var(--accent); }
	.history-summary { padding-block: var(--dimension-1_5rem) var(--dimension-1rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.history-summary dl, .history-summary dl > div { display: flex; align-items: baseline; gap: var(--dimension-0_5rem); }
	.history-summary dl { gap: var(--dimension-1_25rem); flex-wrap: wrap; }
	.history-summary dd { display: inline-flex; gap: var(--dimension-0_25rem); align-items: baseline; color: var(--ink); font-family: var(--mono); font-size: var(--text-0_9rem); }
	.history-summary small { color: var(--muted); font: inherit; font-size: var(--text-0_75rem); }
	.history-table-scroll { position: relative; overflow-x: auto; padding: var(--dimension-0_25rem); margin-inline: calc(-1 * var(--dimension-0_25rem)); }
	table { min-width: var(--dimension-55rem); width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; font-size: var(--text-0_82rem); }
	.race-table { min-width: var(--dimension-38rem); }
	th { font-weight: var(--weight-400); color: var(--muted); font-size: var(--text-0_75rem); padding: var(--dimension-0_75rem); }
	th button { display: inline-flex; gap: var(--dimension-0_35rem); align-items: center; padding-block: var(--dimension-0_25rem); }
	th button span { color: var(--muted); }
	th button .active-sort { color: var(--accent); }
	th abbr { text-underline-offset: var(--dimension-0_25rem); cursor: help; }
	td { padding: var(--dimension-0_65rem) var(--dimension-0_75rem); font-variant-numeric: tabular-nums; }
	tbody tr:nth-child(even) { background: var(--surface); }
	tbody tr:not(.skeleton-row):hover, tbody tr:focus-within { background: var(--accent-wash); }
	.wpm { color: var(--accent); font-weight: var(--weight-700); }
	.mode-cell { min-width: var(--dimension-11rem); }
	.separator { padding-inline: var(--dimension-0_15rem); }
	.history-row { display: grid; place-items: center; width: var(--dimension-2rem); height: var(--dimension-2rem); border-radius: var(--radius-0_3rem); color: var(--accent); }
	.history-row:hover { background: var(--inset); }
	.history-footer { align-items: start; margin-top: var(--dimension-1rem); }
	.history-footer p { font-size: var(--text-0_72rem); color: var(--muted); line-height: var(--leading-1_65); }
	.scroll-hint { display: none; font-size: var(--text-0_72rem); color: var(--muted); margin-bottom: var(--dimension-0_5rem); }
	.empty-history { display: grid; justify-items: center; gap: var(--dimension-0_75rem); text-align: center; padding: var(--dimension-3rem) var(--dimension-1rem); border-block: var(--dimension-1px) solid var(--line); }
	.empty-history h2 { font-weight: var(--weight-600); font-size: var(--text-1_125rem); }
	.empty-history p { color: var(--muted); font-size: var(--text-0_82rem); }
	.empty-history .button { margin-top: var(--dimension-0_5rem); }
	.error-message { padding-block: var(--dimension-0_75rem); font-size: var(--text-0_82rem); color: var(--error); }
	.error-message button { text-decoration: underline; }
	.loading-detail { color: var(--muted); font-size: var(--text-0_82rem); }
	.detail-view { display: grid; gap: var(--dimension-1_5rem); }
	.back-button { margin-left: auto; padding: var(--dimension-0_5rem) 0; color: var(--accent); font-size: var(--text-0_82rem); }
	.detail-heading { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: var(--dimension-0_75rem); }
	.detail-heading h2 { font-weight: var(--weight-600); font-size: var(--text-1_125rem); }
	.detail-heading time { color: var(--muted); font-size: var(--text-0_75rem); }
	.saved-race-settings { padding-block: var(--dimension-0_85rem); border-block: var(--dimension-1px) solid var(--line); }
	.saved-race-settings dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dimension-8rem)), 1fr)); gap: var(--dimension-0_75rem) var(--dimension-1rem); }
	.saved-race-settings dt, .saved-race-settings p { color: var(--muted); font-size: var(--text-0_75rem); }
	.saved-race-settings dd { margin-top: var(--dimension-0_25rem); font-size: var(--text-0_9rem); }
	.skeleton { display: block; height: var(--dimension-0_75rem); border-radius: var(--radius-99px); background: var(--accent-wash); }
	.summary-placeholder { width: var(--dimension-3rem); height: var(--dimension-1em); }
	.skeleton-row td { height: var(--dimension-3_25rem); }
	.table-placeholder { min-width: var(--dimension-2rem); width: 75%; }
	.skeleton-row td:nth-last-child(2) .table-placeholder { min-width: var(--dimension-8rem); }
	.skeleton-row td:last-child .table-placeholder { width: var(--dimension-1rem); min-width: 0; }
	@media (prefers-reduced-motion: no-preference) {
		.skeleton { animation: breathe var(--motion-1_2s) ease-in-out infinite alternate; }
	}
	@keyframes breathe { to { opacity: .4; } }
	button { cursor: pointer; }
	button:disabled { cursor: wait; }
	.filter-actions button:disabled { color: var(--muted); cursor: not-allowed; }
	@media (max-width: 64rem) { .scroll-hint { display: block; } }
	@media (max-width: 40rem) {
		.history-navigation { gap: var(--dimension-0_5rem); }
		.history-tabs { gap: var(--dimension-0_75rem); }
		.history-tabs button { font-size: var(--text-0_82rem); }
		.back-button { font-size: var(--text-0_75rem); }
		.filter { max-width: none; min-width: 0; flex-basis: 40%; }
		.filter-actions { flex: 1; justify-content: end; }
		.history-summary { align-items: start; gap: var(--dimension-0_75rem); }
		.history-summary dl { gap: var(--dimension-0_75rem); }
		.history-summary dl > div { display: grid; gap: var(--dimension-0_15rem); }
	}
</style>
