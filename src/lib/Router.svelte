<script lang="ts">
	import Router, { router } from "svelte-spa-router";
	import Game from "./features/practice/CodePractice.svelte";
	import About from "../pages/About.svelte";
	import Themes from "../pages/Themes.svelte";
	import Security from "../pages/Security.svelte";
	import Terms from "../pages/Terms.svelte";
	import Privacy from "../pages/Privacy.svelte";
	import Home from "../pages/Home.svelte";
	import Login from "../pages/Login.svelte";
	import Account from "../pages/Account.svelte";
	import History from "../pages/History.svelte";
	import Leaderboards from "../pages/Leaderboards.svelte";
	import Multiplayer from "./features/multiplayer/Multiplayer.svelte";
	import Ranking from "./features/multiplayer/Ranking.svelte";
	import { preferencesReady } from "./state/preferences.store";
	import Navbar from "./components/layout/Navbar.svelte";
	import { setPracticeHeader } from "./components/layout/practice-header-context";
	import socket from "./features/multiplayer/socket";
	import { emptyRoom, roomInfo } from "./features/multiplayer/room.store";

	let practiceLayout = $derived(
		router.location === "/" || router.location === "/game" || router.location === "/themes" || router.location === "/about" ||
		router.location === "/security" || router.location === "/terms" || router.location === "/privacy"
	);
	let pageLayout = $derived(
		router.location === "/login" || router.location === "/race" ||
		router.location === "/ranking" || router.location === "/leaderboard" || router.location === "/account" || router.location === "/history"
	);

	const practiceHeader = $state({ active: false });
	setPracticeHeader(practiceHeader);
	let headerMode: "code" | "prose" | undefined = $derived(router.location === "/game" ? "code" : practiceLayout || pageLayout ? "prose" : undefined);

	const routes = {
		"/": Home,
		"/about": About,
		"/game": Game,
		"/themes": Themes,
		"/login": Login,
		"/account": Account,
		"/history": History,
		"/race": Multiplayer,
		"/ranking": Ranking,
		"/leaderboard": Leaderboards,
		"/security": Security,
		"/terms": Terms,
		"/privacy": Privacy,
	};

	$effect(() => {
		if (router.location !== "/race" && router.location !== "/ranking") {
			socket.disconnect();
			roomInfo.set(emptyRoom);
		}
	});
</script>

<div class="route-shell" class:page-shell={practiceLayout || pageLayout} class:practice-shell={practiceLayout}>
	{#if router.location}
		<Navbar mode={headerMode} active={practiceLayout && practiceHeader.active} />
	{/if}
	{#key router.location}
		<div class="route-content" class:engine-page={!practiceLayout} class:page-content={pageLayout} class:compact-content={router.location === "/ranking"} class:race-content={router.location === "/race"}>
			{#if !$preferencesReady && (router.location === "/" || router.location === "/game")}
				<section class="page-content preference-loading" aria-label="Practice settings" aria-busy="true">
					<p role="status">Loading your practice settings…</p>
				</section>
			{:else}
				<Router {routes} />
			{/if}
		</div>
	{/key}
</div>

<style>
	.preference-loading { margin-block: auto; padding-block: var(--dimension-2rem); color: var(--muted); }
	.route-shell { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.route-shell:not(.page-shell) > .route-content, .route-shell.practice-shell > .route-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.route-shell > .race-content { display: flex; flex: 1; flex-direction: column; justify-content: center; }
</style>
