<script lang="ts">
	import Router, { router } from "svelte-spa-router";
	import Game from "./features/practice/CodePractice.svelte";
	import About from "../pages/About.svelte";
	import Themes from "../pages/Themes.svelte";
	import Home from "../pages/Home.svelte";
	import Login from "../pages/Login.svelte";
	import Account from "../pages/Account.svelte";
	import History from "../pages/History.svelte";
	import Leaderboards from "../pages/Leaderboards.svelte";
	import Multiplayer from "./features/multiplayer/Multiplayer.svelte";
	import Ranking from "./features/multiplayer/Ranking.svelte";
	import Navbar from "./components/layout/Navbar.svelte";
	import socket from "./features/multiplayer/socket";
	import { emptyRoom, roomInfo } from "./features/multiplayer/room.store";

	let practiceLayout = $derived(
		router.location === "/" || router.location === "/game" || router.location === "/themes" || router.location === "/about"
	);
	let pageLayout = $derived(
		router.location === "/login" || router.location === "/race" ||
		router.location === "/ranking" || router.location === "/leaderboard" || router.location === "/account" || router.location === "/history"
	);

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
	};

	$effect(() => {
		if (router.location !== "/race" && router.location !== "/ranking") {
			socket.disconnect();
			roomInfo.set(emptyRoom);
		}
	});
</script>

<div class="route-shell" class:page-shell={pageLayout}>
	{#if router.location && !practiceLayout}
		<Navbar mode={pageLayout ? "prose" : undefined} />
	{/if}
	{#key router.location}
		<div class="route-content" class:engine-page={!practiceLayout} class:page-content={pageLayout} class:compact-content={router.location === "/ranking"} class:race-content={router.location === "/race"}>
			<Router {routes} />
		</div>
	{/key}
</div>

<style>
	.route-shell { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.route-shell:not(.page-shell) > .route-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.route-shell > .race-content { display: flex; flex: 1; flex-direction: column; justify-content: center; }
</style>
