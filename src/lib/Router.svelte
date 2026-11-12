<script lang="ts">
	import Router, { router } from "svelte-spa-router";
	import Game from "./features/practice/CodePractice.svelte";
	import About from "../pages/About.svelte";
	import Themes from "../pages/Themes.svelte";
	import Home from "../pages/Home.svelte";
	import Login from "../pages/Login.svelte";
	import Multiplayer from "./features/multiplayer/Multiplayer.svelte";
	import Ranking from "./features/multiplayer/Ranking.svelte";
	import Navbar from "./components/layout/Navbar.svelte";
	import socket from "./features/multiplayer/socket";
	import { emptyRoom, roomInfo } from "./features/multiplayer/room.store";

	let practiceLayout = $derived(
		router.location === "/" || router.location === "/game" || router.location === "/themes" || router.location === "/about"
	);
	let multiplayerLayout = $derived(
		router.location === "/login" || router.location === "/race" ||
		router.location === "/ranking" || router.location === "/leaderboard"
	);

	const routes = {
		"/": Home,
		"/about": About,
		"/game": Game,
		"/themes": Themes,
		"/login": Login,
		"/race": Multiplayer,
		"/ranking": Ranking,
		"/leaderboard": Ranking,
	};

	$effect(() => {
		if (router.location !== "/race" && router.location !== "/ranking") {
			socket.disconnect();
			roomInfo.set(emptyRoom);
		}
	});
</script>

<div class:page-shell={multiplayerLayout}>
	{#if router.location && !practiceLayout}
		<Navbar mode={multiplayerLayout ? "prose" : undefined} />
	{/if}
	{#key router.location}
		<div class="route-content" class:engine-page={!practiceLayout} class:page-content={multiplayerLayout} class:compact-content={router.location === "/ranking"} class:race-content={router.location === "/race"}>
			<Router {routes} />
		</div>
	{/key}
</div>

<style>
	.race-content { display: flex; flex: 1; flex-direction: column; }
</style>
