<script lang="ts">
	import Router from "./lib/Router.svelte";
	import { theme } from "./lib/state/app.store";
	import { onMount } from "svelte";
	import { account } from "./lib/state/account.store";
	import { startResultSync } from "./lib/features/practice/result-persistence";
	import socket from "./lib/features/multiplayer/socket";
	import { emptyRoom, roomInfo } from "./lib/features/multiplayer/room.store";
	import { finalRanking } from "./lib/features/multiplayer/race.store";
	import { racePersistence, raceRoundId } from "./lib/state/race-persistence.store";
	import Footer from "./lib/components/layout/Footer.svelte";

	onMount(() => {
		const onPersistence = (value: { roundId: string; state: "pending" | "saved" | "failed" }) => {
			if (value.roundId === $raceRoundId) racePersistence.set(value);
		};
		socket.on("persistenceStatus", onPersistence);
		let identity: string | null | undefined;
		const unsubscribe = account.subscribe(({ session }) => {
			const next = session?.user.id ?? null;
			if (identity !== undefined && next !== identity) {
				socket.disconnect(); roomInfo.set(emptyRoom); finalRanking.set([]); racePersistence.set(null); raceRoundId.set(null);
				const roomId = localStorage.getItem("roomId");
				if (roomId) {
					localStorage.removeItem(`clumsy-keys:room-session:${roomId}`);
					localStorage.removeItem(`clumsy-keys:race:${roomId}`);
				}
				localStorage.removeItem("roomId"); localStorage.removeItem("username");
			}
			identity = next;
		});
		const stopResults = startResultSync();
		return () => { unsubscribe(); stopResults(); socket.off("persistenceStatus", onPersistence); };
	});

	$effect(() => {
		document.documentElement.dataset.theme = $theme;
	});
</script>

<div class="app-frame py-5">
<main>
	<Router />
</main>
<footer class="page-footer global-footer"><Footer showShortcuts={false} /></footer>
</div>

<style>
	.app-frame { display: flex; flex-direction: column; min-height: 100svh; }
	main { display: flex; flex-direction: column; flex: 1; min-width: 0; }
	.global-footer { width: min(100% - var(--dimension-2rem), var(--dimension-66_625rem)); margin-inline: auto; padding-top: var(--dimension-1_25rem); }
</style>
