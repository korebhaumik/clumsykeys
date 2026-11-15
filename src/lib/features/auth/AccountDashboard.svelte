<script lang="ts">
	import type { User } from "@supabase/supabase-js";
	import type { AccountDashboard } from "../../../../backend/src/persistence.contract";
	import { accountApi } from "../../services/account-api";
	import { preferenceSync } from "../../state/preferences.store";
	import { reloadAccountPreferences } from "../settings/account-preferences";
	import ArrowRightIcon from "../../components/icons/ArrowRightIcon.svelte";
	import GlobeIcon from "../../components/icons/GlobeIcon.svelte";
	import { practiceModes, safeWebsite, testLabel, testLanguage, typingTime } from "./dashboard";

	let { user, name, busy, onsignout }: { user: User; name: string; busy: boolean; onsignout: () => Promise<void> } = $props();
	let dashboard = $state<AccountDashboard>();
	let loading = $state(true);
	const initialLoading = $derived(loading && !dashboard);
	let error = $state("");
	let request = 0;
	const id = $props.id();
	const website = $derived(safeWebsite(user.user_metadata.website || user.user_metadata.blog));
	const bio = $derived(typeof user.user_metadata.bio === "string" ? user.user_metadata.bio.slice(0, 300) : "Your practice. Your progress. One keystroke at a time.");
	const joined = $derived(new Date(user.created_at));
	const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
	const stats = $derived(dashboard ? [
		{ label: "tests completed", value: number(dashboard.stats.tests) },
		{ label: "average wpm", value: dashboard.stats.tests ? number(dashboard.stats.averageWpm) : "—" },
		{ label: "time typing", value: typingTime(dashboard.stats.seconds) },
		{ label: "average accuracy", value: dashboard.stats.tests ? `${number(dashboard.stats.averageAccuracy)}%` : "—" },
		{ label: "average wpm (raw)", value: dashboard.stats.tests ? number(dashboard.stats.averageRaw) : "—" },
		{ label: "highest wpm", value: dashboard.stats.tests ? number(dashboard.stats.bestWpm) : "—" },
		{ label: "characters typed", value: number(dashboard.stats.characters) },
		{ label: "average duration", value: dashboard.stats.tests ? `${number(dashboard.stats.seconds / dashboard.stats.tests)}s` : "—" },
	] : ["tests completed", "average wpm", "time typing", "average accuracy", "average wpm (raw)", "highest wpm", "characters typed", "average duration"].map(label => ({ label, value: "" })));

	async function load(accountId: string) {
		const version = ++request;
		loading = true; error = "";
		try {
			const result = await accountApi<AccountDashboard>("/api/account/dashboard", { accountId });
			if (version === request) dashboard = result;
		} catch (cause) {
			if (version === request) error = cause instanceof Error ? cause.message : "Could not load your statistics. Please retry.";
		} finally { if (version === request) loading = false; }
	}
	$effect(() => {
		const accountId = user.id;
		dashboard = undefined;
		void load(accountId);
		return () => { request++; };
	});
</script>

<div class="dashboard">
	<h1 id="account-title" class="sr-only">Your account.</h1>
	<div class="profile-banner" aria-hidden="true"></div>
	<header class="profile-identity">
		<div class="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
		<h2>{name}</h2>
		{#if Number.isFinite(joined.getTime())}<p class="joined">Joined <time datetime={user.created_at}>{joined.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time></p>{/if}
		<p class="profile-bio">{bio}</p>
		{#if website}<a class="profile-website" href={website.href} target="_blank" rel="noopener noreferrer"><GlobeIcon />{website.hostname}</a>{/if}
	</header>

	<div class="dashboard-toolbar"><p>Saved solo practice · all time</p><button class="button button-secondary" disabled={loading} onclick={() => load(user.id)}>{loading ? "Refreshing…" : "Refresh stats"}</button></div>
	{#if loading && !dashboard}<p class="sr-only" role="status">Loading your practice statistics…</p>{/if}
	{#if error}<p class="dashboard-error" role="alert">{error}{#if dashboard} Showing the previous snapshot.{/if}</p>{/if}
	{#if dashboard || loading}
		<section class="dashboard-section" aria-labelledby={`${id}-stats`} aria-busy={loading}>
			<h2 id={`${id}-stats`}>Stats</h2>
			<dl class="stats-grid">{#each stats as stat}<div><dt>{stat.label}</dt><dd>{#if initialLoading}<span class="skeleton stat-placeholder" aria-hidden="true"></span>{:else}{stat.value}{/if}</dd></div>{/each}</dl>
		</section>
		<section class="dashboard-section" aria-labelledby={`${id}-bests`} aria-busy={loading}>
			<h2 id={`${id}-bests`}>Personal bests</h2>
			<p class="section-note">Highest saved WPM per mode. Test settings and languages can differ.</p>
			<div class="bests-grid">
				{#each practiceModes as mode}
					{@const best = dashboard?.bests.find(row => row.mode === mode.value)}
					<article class="best-card"><h3>{mode.label}</h3>
						{#if initialLoading}<div class="best-placeholders" aria-hidden="true"><span class="skeleton best-number"></span><span class="skeleton"></span><span class="skeleton"></span></div>
						{:else if best}<p class="best-speed">{number(best.wpm)} <span>wpm</span></p><p class="best-accuracy">{number(best.accuracy)}% accuracy</p><p class="best-context">{testLabel(best)} · {testLanguage(best.language)}</p>
						{:else}<p class="best-speed empty-best">—</p><p class="best-context">Your first best is ahead of you.</p><a href={mode.value === "prose" ? "#/" : "#/game"}>Start practising <ArrowRightIcon /></a>{/if}
					</article>
				{/each}
			</div>
		</section>
		<section class="dashboard-section" aria-labelledby={`${id}-recent`} aria-busy={loading}>
			<div class="recent-heading">
				<h2 id={`${id}-recent`}>Recent tests</h2>
				<a class="history-link" href="#/history">View your history <ArrowRightIcon /></a>
			</div>
			{#if initialLoading || dashboard?.recent.length}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the results table.) -->
				<div class="recent-scroll" role="region" aria-label="Recent test results, scroll for more columns" tabindex="0"><table>
					<caption class="sr-only">Your five most recent saved solo practice tests</caption>
					<thead><tr>{#each ["wpm", "wpm (raw)", "accuracy", "wpm std", "chars¹", "mode", "language", "date"] as label}<th scope="col">{label}</th>{/each}</tr></thead>
					<tbody>{#if initialLoading}
						{#each Array.from({ length: 5 }, (_, index) => index) as index (index)}<tr class="skeleton-row" aria-hidden="true">{#each Array.from({ length: 8 }, (_, column) => column) as column (column)}<td><span class="skeleton table-placeholder"></span></td>{/each}</tr>{/each}
					{:else}{#each dashboard?.recent ?? [] as row}<tr><td>{number(row.wpm)}</td><td>{number(row.raw)}</td><td>{number(row.accuracy)}%</td><td>{number(row.deviation)}</td><td>{row.correct}/{row.incorrect}/{row.extra}</td><td>{practiceModes.find(mode => mode.value === row.mode)?.label} · {testLabel(row)}</td><td>{testLanguage(row.language)}</td><td><time datetime={row.created_at}>{new Date(row.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></td></tr>{/each}{/if}</tbody>
				</table></div>
				<p class="table-note">¹ Characters: correct / incorrect / extra.</p>
			{:else}<p class="empty-history">No saved results yet. Your next practice is a fresh start. <a href="#/">Start practising <ArrowRightIcon /></a></p>{/if}
		</section>
	{/if}
	<footer class="account-controls">
		<div><p class="account-email">{user.email}</p><p role="status">{$preferenceSync.message}</p></div>
		<div class="account-actions">{#if $preferenceSync.state === "error" || $preferenceSync.state === "conflict"}<button class="button button-secondary" onclick={() => reloadAccountPreferences()}>Retry preference sync</button>{/if}<a class="button button-secondary" href="#/">Practice</a><button class="button button-secondary" disabled={busy} onclick={onsignout}>Sign out</button></div>
	</footer>
</div>

<style>
	.dashboard { width: 100%; min-width: 0; }
	.profile-banner { height: clamp(var(--dimension-6rem), var(--dimension-7vw), var(--dimension-9rem)); border-radius: var(--radius-0_55rem); background: linear-gradient(110deg, var(--accent), var(--caret)); }
	.profile-identity { text-align: center; max-width: var(--dimension-38rem); margin-inline: auto; }
	.profile-avatar { position: relative; display: grid; place-items: center; width: var(--dimension-5rem); height: var(--dimension-5rem); margin: calc(var(--dimension-2_5rem) * -1) auto 0; border: var(--dimension-0_35rem) solid var(--inset); border-radius: 50%; background: linear-gradient(135deg, var(--profile-avatar-start), var(--profile-avatar-end)); color: var(--profile-avatar-ink); font-size: var(--text-1_8rem); font-weight: var(--weight-700); }
	.profile-identity h2 { margin-top: var(--dimension-0_5rem); font-size: var(--text-1_8rem); letter-spacing: var(--tracking-negative-_045em); overflow-wrap: anywhere; }
	.joined { margin-top: var(--dimension-0_25rem); color: var(--muted); font-size: var(--text-0_75rem); }
	.profile-bio { margin-top: var(--dimension-0_75rem); font-size: var(--text-0_9rem); line-height: var(--leading-1_65); overflow-wrap: anywhere; }
	.profile-website { display: inline-flex; align-items: center; gap: var(--dimension-0_35rem); margin-top: var(--dimension-0_65rem); color: var(--accent); font-size: var(--text-0_875rem); overflow-wrap: anywhere; }
	.profile-website :global(svg) { flex: none; }
	.dashboard-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--dimension-0_75rem); margin-top: var(--dimension-2rem); color: var(--muted); font: var(--text-0_72rem) var(--mono); }
	.dashboard-toolbar .button { font-size: var(--text-0_75rem); }
	.dashboard-section { width: 100%; min-width: 0; margin-top: var(--dimension-2rem); }
	.dashboard-section > h2 { text-align: center; font-size: var(--text-1_25rem); font-weight: var(--weight-600); }
	.stats-grid { text-align: center; width: 100%; min-width: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--dimension-1_5rem) var(--dimension-2rem); margin-top: var(--dimension-1_5rem); }
	dt { color: var(--muted); font-size: var(--text-0_82rem); }
	dd { margin-top: var(--dimension-0_25rem); color: var(--accent); font: var(--text-1_8rem) var(--mono); }
	.section-note { margin-top: var(--dimension-0_55rem); text-align: center; font-size: var(--text-0_75rem); color: var(--muted); }
	.bests-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--dimension-1rem); margin-top: var(--dimension-1_25rem); }
	.best-card { padding: var(--dimension-1_25rem); background: var(--surface); border-radius: var(--radius-0_55rem); min-width: 0; }
	.best-card h3 { font-size: var(--text-0_82rem); color: var(--muted); }
	.best-speed { margin-top: var(--dimension-0_5rem); font-size: var(--text-1_8rem); line-height: var(--leading-1_2); }
	.best-speed > span { font-size: var(--text-1rem); }
	.best-accuracy { margin-top: var(--dimension-0_35rem); color: var(--accent); font-size: var(--text-0_82rem); }
	.best-context { margin-top: var(--dimension-0_55rem); font: var(--text-0_72rem) var(--mono); line-height: var(--leading-1_65); color: var(--muted); overflow-wrap: anywhere; }
	.best-card a, .empty-history a, .history-link { display: inline-flex; align-items: center; gap: var(--dimension-0_35rem); color: var(--accent); font-size: var(--text-0_82rem); }
	.best-card a { margin-top: var(--dimension-0_75rem); }
	.empty-best { color: var(--muted); }
	.recent-scroll { margin-top: var(--dimension-1_25rem); overflow-x: auto; border-radius: var(--radius-0_3rem); }
	table { width: 100%; border-collapse: collapse; text-align: left; font-size: var(--text-0_82rem); white-space: nowrap; }
	th, td { padding: var(--dimension-0_75rem) var(--dimension-0_65rem); }
	th { color: var(--muted); font-weight: var(--weight-400); }
	tbody tr:nth-child(even) { background: var(--surface); }
	.table-note { margin-top: var(--dimension-0_5rem); color: var(--muted); font-size: var(--text-0_72rem); }
	.recent-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-0_5rem); }
	.recent-heading h2 { font-size: var(--text-1_25rem); font-weight: var(--weight-600); }
	.history-link { flex-shrink: 0; white-space: nowrap; }
	@media (max-width: 400px) {
		.recent-heading h2 { font-size: var(--text-1rem); }
		.history-link { font-size: var(--text-0_72rem); }
	}
	.empty-history { margin-top: var(--dimension-1_25rem); color: var(--muted); font-size: var(--text-0_875rem); line-height: var(--leading-1_65); }
	.dashboard-error { margin-top: var(--dimension-1rem); color: var(--error); font-size: var(--text-0_82rem); }
	.account-controls { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--dimension-1rem); border-top: var(--dimension-1px) solid var(--line); margin-top: var(--dimension-2rem); padding-top: var(--dimension-1_25rem); font-size: var(--text-0_75rem); color: var(--muted); }
	.account-controls > div { min-width: 0; }
	.account-email { overflow-wrap: anywhere; margin-bottom: var(--dimension-0_35rem); }
	.account-actions { display: flex; flex-wrap: wrap; gap: var(--dimension-0_55rem); }
	.skeleton { display: block; height: var(--dimension-0_75rem); border-radius: var(--radius-99px); background: var(--accent-wash); }
	.stat-placeholder { display: inline-block; height: var(--dimension-1em); width: var(--dimension-5rem); vertical-align: middle; }
	.best-placeholders { display: grid; gap: var(--dimension-0_75rem); margin-top: var(--dimension-0_75rem); padding-bottom: var(--dimension-0_5rem); }
	.best-number { height: var(--dimension-1_8rem); width: 50%; }
	.best-placeholders > span:last-child { width: 75%; }
	.table-placeholder { min-width: var(--dimension-3rem); width: 75%; margin-block: var(--dimension-0_2rem); }
	@media (prefers-reduced-motion: no-preference) {
		.skeleton { animation: breathe var(--motion-1_2s) ease-in-out infinite alternate; }
		@keyframes breathe { to { opacity: 0.4; } }
	}
	@media (max-width: 48rem) {
		.stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--dimension-1_25rem) var(--dimension-0_75rem); }
		dd { font-size: var(--text-1_45rem); }
		.bests-grid { grid-template-columns: minmax(0, 1fr); }
		.profile-identity h2 { font-size: var(--text-1_45rem); }
	}
</style>
