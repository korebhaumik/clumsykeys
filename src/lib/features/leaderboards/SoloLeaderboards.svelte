<script lang="ts">
	import { untrack } from "svelte";
	import { push, replace, router } from "svelte-spa-router";
	import LeaderboardsIcon from "../../components/icons/LeaderboardsIcon.svelte";
	import ArrowRightIcon from "../../components/icons/ArrowRightIcon.svelte";
	import Dropdown from "../../components/Dropdown.svelte";
	import { account } from "../../state/account.store";
	import LeaderboardTable from "./LeaderboardTable.svelte";
	import { filterQuery, languageOptions, lengthOptions, pageSize, parseFilters, testOptions, timeRanges, updateFilters, type LeaderboardFilters, type LeaderboardMode, type LeaderboardPage } from "./leaderboard";
	import { leaderboardService, previewUserId, type LeaderboardService } from "./leaderboard-service";

	let { service = leaderboardService }: { service?: LeaderboardService } = $props();
	const id = $props.id();
	const filters = $derived(parseFilters(router.querystring ?? ""));
	const viewerId = $derived($account.session?.user.id ?? (service.isDemo ? previewUserId : null));
	const preview = $derived(service.isDemo && !$account.session);
	let result = $state<LeaderboardPage>();
	let loading = $state(true);
	let error = $state("");
	let retry = $state(0);
	const own = $derived(result?.currentUser);
	const ownPage = $derived(own ? Math.ceil(own.rank / pageSize) : 1);
	const boardLabel = $derived(`${languageOptions(filters.mode).find(option => option.value === filters.language)?.label} · ${testOptions(filters.mode).find(option => option.value === filters.test)?.label} · ${lengthOptions(filters.test).find(option => option.value === filters.length)?.label}`);

	$effect(() => {
		const selected = filters, userId = viewerId, source = service;
		void retry;
		const controller = new window.AbortController();
		loading = true; error = ""; result = undefined;
		void source.read(selected, userId, controller.signal).then(data => {
			if (controller.signal.aborted) return;
			result = data; loading = false;
			if (data.page !== selected.page) void replace(`/leaderboard?${filterQuery({ ...selected, page: data.page })}`);
		}).catch(cause => {
			if (!controller.signal.aborted) { error = cause instanceof Error ? cause.message : "Could not load the leaderboard."; loading = false; }
		});
		// Canonical state survives refresh, including corrected invalid query values.
		if (untrack(() => router.querystring) !== filterQuery(selected)) void replace(`/leaderboard?${filterQuery(selected)}`);
		return () => controller.abort();
	});
	function change(changes: Partial<LeaderboardFilters>) {
		void push(`/leaderboard?${filterQuery(updateFilters(filters, changes))}`);
	}
	function tabKey(event: KeyboardEvent) {
		const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
		if (!keys.includes(event.key)) return;
		event.preventDefault();
		const mode: LeaderboardMode = event.key === "Home" ? "prose" : event.key === "End" ? "dev" : filters.mode === "prose" ? "dev" : "prose";
		change({ mode });
		document.getElementById(`${id}-${mode}`)?.focus();
	}
</script>

<section class="leaderboards stack" aria-labelledby={`${id}-title`}>
	<h1 class="sr-only" id={`${id}-title`}>Leaderboards.</h1>
	<div role="tablist" aria-label="Solo typing mode" class="mode-tabs">
		{#each [{ value: "prose", label: "Prose", hint: "Words & language" }, { value: "dev", label: "Dev", hint: "Code & syntax" }] as mode (mode.value)}
			<button type="button" role="tab" id={`${id}-${mode.value}`} aria-controls={`${id}-board`} aria-selected={filters.mode === mode.value} tabindex={filters.mode === mode.value ? 0 : -1} onkeydown={tabKey} onclick={() => change({ mode: mode.value as LeaderboardMode })}><span>{mode.label}</span><small>{mode.hint}</small></button>
		{/each}
	</div>
	<div id={`${id}-board`} role="tabpanel" aria-labelledby={`${id}-${filters.mode}`} class="board-panel" tabindex="0">
		<div class="filters">
			<div class="filter"><span>Language</span><Dropdown label="Leaderboard language" value={filters.language} options={languageOptions(filters.mode)} disabled={filters.test === "quotes"} onchange={language => change({ language })} /></div>
			<div class="filter"><span>Test</span><Dropdown label="Leaderboard test" value={filters.test} options={testOptions(filters.mode)} onchange={test => change({ test })} /></div>
			<div class="filter"><span>Length</span><Dropdown label="Test length" value={filters.length} options={lengthOptions(filters.test)} disabled={lengthOptions(filters.test).length === 1} onchange={length => change({ length })} /></div>
			<div class="filter"><span>Time range</span><Dropdown label="Time range" value={filters.range} options={timeRanges} onchange={range => change({ range })} /></div>
		</div>
		<div class="board-meta"><h2>{boardLabel}</h2>{#if service.isDemo}<span class="badge badge-accent" title="Sample scores only; saved results are not included.">Demo scores</span>{/if}<p role="status" aria-live="polite">{loading ? "Loading rankings…" : error ? "Rankings unavailable" : `${result?.total ?? 0} players · best result per player`}</p></div>
		<div class="your-standing" aria-label={preview ? "Preview player standing" : "Your standing"}>
			<span class="standing-label">{preview ? "Your preview rank" : "Your rank"}</span>
			{#if loading}<span class="muted">Finding your place…</span>
			{:else if error}<span class="muted">Available when rankings load.</span>
			{:else if own}<strong>#{own.rank} <span>{own.wpm} WPM · {own.accuracy.toFixed(1)}%</span></strong><button class="button button-secondary" disabled={ownPage === result?.page} onclick={() => change({ page: ownPage })}>{ownPage === result?.page ? "On this page" : "View your page"}</button>
			{:else if !viewerId}<span class="muted">Sign in to see your rank.</span><a href="#/account">Sign in →</a>
			{:else}<span class="muted">No ranked result for this selection.</span><a href={filters.mode === "dev" ? "#/game" : "#/"}>Start a solo test →</a>{/if}
		</div>
		<p class="scroll-hint">Scroll the table to see every column →</p>
		<LeaderboardTable rows={result?.rows ?? []} {loading} currentUserId={result?.currentUser?.userId ?? null}>
			{#if error}<h3>Rankings couldn’t load.</h3><p class="error" role="alert">{error}</p><button class="button button-primary" onclick={() => retry++}>Retry rankings</button>
			{:else}
				<div class="empty-card">
					<div class="empty-icon" aria-hidden="true"><LeaderboardsIcon /></div>
					<div class="empty-copy"><h3>A fresh leaderboard.</h3><p>No results match these filters yet.<br class="empty-break" /> Be the first to set the pace.</p></div>
					<a class="button button-primary empty-action" href={filters.mode === "dev" ? "#/game" : "#/"}>Start a solo test <ArrowRightIcon /></a>
				</div>
			{/if}
		</LeaderboardTable>
		{#if loading || error || result?.total}
		<nav class="pagination" aria-label="Leaderboard pages"><p>{result?.total ? `${(result.page - 1) * pageSize + 1}–${Math.min(result.page * pageSize, result.total)} of ${result.total}` : "0 results"}</p><div><button class="button button-secondary" disabled={loading || !!error || !result || result.page <= 1} onclick={() => change({ page: result!.page - 1 })} aria-label="Previous leaderboard page">← Previous</button><span>Page {result?.page ?? filters.page} of {result?.pages ?? "…"}</span><button class="button button-secondary" disabled={loading || !!error || !result || result.page >= result.pages} onclick={() => change({ page: result!.page + 1 })} aria-label="Next leaderboard page">Next →</button></div></nav>
		<p class="ranking-note">Ranked by WPM, then accuracy. Equal scores favor the earlier result. Each test format and length has its own board. Snippet and quote difficulty can vary.</p>
		{/if}
	</div>
</section>

<style>
	.leaderboards { width: 100%; min-width: 0; gap: var(--dimension-1_5rem); }
	.mode-tabs { display: flex; justify-content: flex-start; gap: var(--dimension-2rem); border-bottom: var(--dimension-1px) solid var(--line); }
	.mode-tabs button { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--dimension-0_75rem); padding: var(--dimension-0_75rem) 0; text-align: left; justify-content: flex-start; border-bottom: var(--dimension-3px) solid transparent; color: var(--muted); }
	.mode-tabs [aria-selected="true"] { color: var(--accent); border-color: var(--accent); }
	.mode-tabs span { font-weight: var(--weight-700); font-size: var(--text-1_125rem); }
	.mode-tabs small { font-size: var(--text-0_75rem); }
	.board-panel { min-width: 0; }
	.filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--dimension-1rem); }
	.filter { display: grid; gap: var(--dimension-0_5rem); min-width: 0; }
	.filter > span { font-size: var(--text-0_75rem); color: var(--muted); }
	.board-meta { display: flex; justify-content: space-between; align-items: baseline; gap: var(--dimension-0_75rem); flex-wrap: wrap; margin-block: var(--dimension-1_5rem) var(--dimension-1rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.board-meta > [role="status"] { margin-left: auto; }
	h2 { color: var(--ink); line-height: var(--leading-1_65); }
	.your-standing { display: flex; align-items: center; flex-wrap: wrap; gap: var(--dimension-0_75rem) var(--dimension-1_25rem); min-height: var(--dimension-6rem); padding: var(--dimension-1rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); margin-bottom: var(--dimension-1rem); font-size: var(--text-0_82rem); }
	.standing-label { color: var(--muted); }
	.your-standing strong { color: var(--accent); font: var(--text-1_25rem) var(--mono); }
	.your-standing strong span { font-size: var(--text-0_82rem); margin-left: var(--dimension-0_75rem); }
	.your-standing :is(button, a) { margin-left: auto; font-size: var(--text-0_75rem); }
	.your-standing a { color: var(--accent); }
	.pagination { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--dimension-1rem); margin-top: var(--dimension-1rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.pagination > div { display: flex; align-items: center; gap: var(--dimension-0_75rem); }
	.pagination .button { font-size: var(--text-0_75rem); }
	.ranking-note { margin-top: var(--dimension-1_25rem); color: var(--muted); font-size: var(--text-0_75rem); line-height: var(--leading-1_65); }
	.empty-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--dimension-1_25rem); width: 100%; padding: var(--dimension-1_5rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_75rem); background: var(--surface); text-align: left; }
	.empty-icon { display: grid; place-items: center; width: var(--dimension-3rem); height: var(--dimension-3rem); border-radius: var(--radius-0_75rem); background: var(--accent-wash); color: var(--accent); }
	.empty-copy h3 { font-size: var(--text-1_125rem); font-weight: var(--weight-600); letter-spacing: var(--tracking-negative-_02em); }
	.empty-copy p { margin-top: var(--dimension-0_4rem); font-size: var(--text-0_82rem); line-height: var(--leading-1_65); color: var(--muted); }
	.empty-action { gap: var(--dimension-0_65rem); white-space: nowrap; font-size: var(--text-0_82rem); }
	@media (max-width: 40rem) {
		.empty-card { grid-template-columns: auto minmax(0, 1fr); gap: var(--dimension-1rem); padding: var(--dimension-1_25rem); }
		.empty-action { grid-column: 1 / -1; justify-content: center; }
		.empty-break { display: none; }
	}
	.error { color: var(--error); }
	.scroll-hint { display: none; color: var(--muted); font-size: var(--text-0_72rem); margin-bottom: var(--dimension-0_5rem); }
	@media (prefers-reduced-motion: no-preference) { .mode-tabs button { transition: color var(--motion-160ms), border-color var(--motion-160ms); } }
	@media (max-width: 48rem) { .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .mode-tabs small { display: none; } }
	@media (max-width: 40rem) { .scroll-hint { display: block; } .pagination > div { width: 100%; justify-content: space-between; gap: var(--dimension-0_35rem); } .pagination .button { padding-inline: var(--dimension-0_5rem); } .your-standing { min-height: var(--dimension-8rem); } }
	@media (max-width: 23rem) { .filters { grid-template-columns: minmax(0, 1fr); } }
</style>
