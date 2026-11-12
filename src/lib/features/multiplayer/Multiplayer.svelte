<script lang="ts">
	import { onMount } from "svelte";
	import { theme } from "../../state/app.store";
	import socket from "./socket";
	import RaceSettings from "./RaceSettings.svelte";
	import { defaultRaceSettings, type RaceSettings as Settings } from "../../../../backend/src/race.settings";
	import Footer from "../../components/layout/Footer.svelte";
	import ClipboardSvg from "../../components/icons/ClipboardIcon.svelte";
	import ProgressBar from "./ProgressBar.svelte";
	import { Toaster, toast } from "svelte-sonner";
	import Game from "./RaceEngine.svelte";
	import {
		typedChars,
		totalChars,
		timeDataArr,
		setGameState,
		game,
		finalRanking,
		resetTest,
		wordsArr,
	} from "./race.store";
	import { push } from "svelte-spa-router";
	import { type Rank } from "./race.store";
	import { type Room, roomInfo } from "./room.store";

	const userId = localStorage.getItem("userId");
	const username = localStorage.getItem("username");
	const roomId = localStorage.getItem("roomId");
	const sessionKey = `clumsy-keys:room-session:${roomId}`;
	const checkpointKey = `clumsy-keys:race:${roomId}`;
	let ready = $state(false);
	let roomDialog = $state<HTMLDialogElement>()!;

	function openRoom() {
		if (!roomDialog.open) roomDialog.showModal();
	}

	function handleShortcut(event: KeyboardEvent) {
		if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyR") {
			event.preventDefault();
			openRoom();
		}
	}

	function changeSettings(patch: Partial<Settings>) {
		if (ready && socket.connected && $roomInfo.progress === "waiting") socket.emit("updateRaceSettings", patch);
	}

	async function copyInvite() {
		if (!roomId) return;
		const invite = new URL(window.location.href);
		invite.search = "";
		invite.hash = `/login?${new URLSearchParams({ room: roomId })}`;
		try {
			await navigator.clipboard.writeText(invite.href);
			toast("Invite link copied");
		} catch {
			toast("Couldn’t copy the invite link. Share the room ID instead.");
		}
	}

	let settings = $derived($roomInfo.settings ?? defaultRaceSettings);
	let roomVotes = $derived($roomInfo.users.filter((user) => user.vote).length);
	let thisUser = $derived($roomInfo.users.find((user) => user.userId === userId));
	let racerCount = $derived($roomInfo.users.length);
	let canVote = $derived(ready && !!thisUser && racerCount >= 2 && $game === "waiting");
	let countdown = $state(0);
	let startsAt = $derived($roomInfo.startsAt);

	$effect(() => {
		const deadline = startsAt;
		if (deadline === undefined) return;
		const update = () => { countdown = Math.max(1, Math.ceil((deadline - Date.now()) / 1000)); };
		update();
		const timer = window.setInterval(update, 100);
		return () => window.clearInterval(timer);
	});

	async function endGame() {
		const ranking: Rank[] = $roomInfo.users.map((user) => {
			return {
				username: user.username,
				userId: user.userId,
				speedHistory: user.speedHistory ?? [],
				finishSeconds: user.finishSeconds,
				wpm: user.wpm,
				accuracy: user.accuracy,
			};
		});
		finalRanking.set(ranking);
		resetTest();
		await push("/ranking");
	}

	onMount(() => {
		if (!username || !userId || !roomId) {
			push("/login");
			return;
		}

		const joinRoom = () => socket.emit("joinRoom", {
			username, userId, roomId, resumeToken: localStorage.getItem(sessionKey) ?? undefined,
		});
		const onSession = ({ resumeToken }: { resumeToken: string }) => {
			localStorage.setItem(sessionKey, resumeToken);
		};
		const onDisconnect = () => { ready = false; };
		const onRoomData = (room: Room) => {
			const user = room.users.find((member) => member.userId === userId);
			if (room.roundId !== $roomInfo.roundId) resetTest();
			$totalChars = room.text.length;
			if (room.text !== $wordsArr.join(" ")) wordsArr.set(room.text.split(" "));
			roomInfo.set(room);
			ready = !!user && socket.connected;
			setGameState(user?.finished ? "finished" : room.progress);

			if (room.progress === "waiting" || room.progress === "finished") {
				localStorage.removeItem(checkpointKey);
			}
			if (room.progress === "finished") void endGame();
		};
		const onNotification = ({ msg }: { msg: string }) => toast(msg);

		socket.on("roomData", onRoomData);
		socket.on("roomSession", onSession);
		socket.on("disconnect", onDisconnect);
		socket.on("notif", onNotification);
		socket.on("error", onNotification);
		socket.on("connect", joinRoom);
		if (socket.connected) joinRoom();
		else socket.connect();

		return () => {
			socket.off("roomData", onRoomData);
			socket.off("roomSession", onSession);
			socket.off("disconnect", onDisconnect);
			socket.off("notif", onNotification);
			socket.off("error", onNotification);
			socket.off("connect", joinRoom);
		};
	});
</script>

<svelte:window onkeydown={handleShortcut} />

{#if thisUser?.isPlaying && $roomInfo.progress === "playing"}
	<h1 class="sr-only">Live race</h1>
	<RaceSettings {settings} />

	<section class="race-standings" aria-label="Live standings">
		{#each $roomInfo.users as user (user.userId)}
			{@const local = user.userId === userId}
			<ProgressBar
				value={local ? $typedChars : user.typedChars}
				max={$totalChars}
				userName={user.username}
				{local}
			/>
		{/each}
	</section>

	{#if $roomInfo.roundId}
		{#key $roomInfo.roundId}
			<Game {ready} {checkpointKey} roundId={$roomInfo.roundId} />
		{/key}
	{/if}

	<footer class="page-footer">
		<Footer onViewRoom={openRoom}>
			{#snippet trailing()}
				{#if thisUser.finished}
					<p class="finish-status" role="status">
						<span><strong>{thisUser.wpm} WPM</strong> | <strong>{$timeDataArr.at(-1)?.finishSeconds?.toFixed(2) ?? "—"} s</strong> | Finished · Waiting for racers</span>
					</p>
				{/if}
			{/snippet}
		</Footer>
	</footer>
{:else}
	<div class="lobby-intro">
		<div class="page-heading">
			<p class="eyebrow">Multiplayer</p>
			<h1>Race lobby</h1>
			<p class="lede">Invite friends, choose your settings, and vote when you’re ready.</p>
		</div>

		<section class="panel invite-panel" aria-labelledby="invite-title">
			<div class="room-id">
				<h2 id="invite-title" class="eyebrow">Room ID</h2>
				<code class="room-code">{roomId ?? "—"}</code>
			</div>
			<button type="button" class="button button-secondary" disabled={!roomId} onclick={copyInvite}>
				<span aria-hidden="true"><ClipboardSvg variant="size-4" /></span>
				Copy invite link
			</button>
		</section>
	</div>

	<div class="lobby-grid">
		<section class="panel roster-panel" aria-labelledby="racers-title">
			<div class="panel-heading">
				<h2 id="racers-title" class="panel-title">Racers <span class="racer-count">{racerCount}</span></h2>
				<span class="badge" class:badge-accent={ready}>
					<span class="status-dot" aria-hidden="true"></span>
					{ready ? "Connected" : racerCount ? "Reconnecting" : "Connecting"}
				</span>
			</div>
			<ul class="roster" aria-label="Racers in the room">
				{#each $roomInfo.users as user (user.userId)}
					<li class="roster-row">
						<span class="initial" class:local={user.userId === userId} aria-hidden="true">{user.username.trim().slice(0, 1).toUpperCase() || "?"}</span>
						<span class="racer-name">{user.username}{#if user.userId === userId}<small>You</small>{/if}</span>
						<span class:badge-accent={user.vote} class="badge">{user.vote ? "Ready" : "Waiting"}</span>
					</li>
				{/each}
			</ul>
			<div class="lobby-actions">
				<div class="vote-status" role="status">
					{#if !ready}
						<p>{racerCount ? "Connection paused" : "Connecting to the room…"}</p>
					{:else if startsAt}
						<p><strong>Race starts in {countdown || 5} s</strong></p>
						<p class="muted">Get ready to type.</p>
					{:else if racerCount < 2}
						<p>Waiting for another racer</p>
						<p class="muted">Share the invite link to get started.</p>
					{:else}
						<p>{roomVotes} of {racerCount} ready</p>
						<p class="muted">The race starts when everyone votes.</p>
					{/if}
				</div>
				<button
					type="button"
					class="button {thisUser?.vote ? 'button-secondary' : 'button-primary'}"
					disabled={!canVote}
					onclick={() => socket.emit(thisUser?.vote ? "stopVote" : "startVote", { roomId, userId })}
				>
					{thisUser?.vote ? "Cancel vote" : "Vote to start"}
				</button>
			</div>
		</section>

		<div class="panel">
			<RaceSettings {settings} onChange={changeSettings} disabled={!ready || !!startsAt || $roomInfo.progress !== "waiting"} />
		</div>
	</div>
{/if}

<dialog bind:this={roomDialog} class="room-dialog panel" aria-labelledby="room-details-title">
	<div class="panel-heading">
		<div>
			<p class="eyebrow">Room details</p>
			<h2 id="room-details-title" class="room-code">{roomId}</h2>
		</div>
		<form method="dialog"><button class="button button-secondary">Close</button></form>
	</div>
	<table>
		<thead><tr><th scope="col">Racer</th><th scope="col">WPM</th><th scope="col">Accuracy</th></tr></thead>
		<tbody>
			{#each $roomInfo.users as user (user.userId)}
				{@const local = user.userId === userId}
				<tr>
					<th scope="row">{user.username}</th>
					<td>{local ? $timeDataArr.at(-1)?.wpm ?? 0 : user.wpm}</td>
					<td>{local ? $timeDataArr.at(-1)?.accuracy ?? 100 : user.accuracy}%</td>
				</tr>
			{/each}
		</tbody>
	</table>
</dialog>

<Toaster
	position="bottom-right"
	theme={$theme === "classic" ? "light" : "dark"}
	visibleToasts={1}
	style="font-family: inherit; --normal-bg: var(--surface); --normal-text: var(--ink); --normal-border: var(--line); --border-radius: var(--radius-0_75rem);"
/>

<style>
	.room-code { font: 600 var(--text-1rem) var(--mono); overflow-wrap: anywhere; }
	.panel-heading, .lobby-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-1rem); flex-wrap: wrap; }
	.panel-heading .eyebrow { margin-bottom: var(--dimension-0_25rem); }
	.lobby-intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .85fr); align-items: end; gap: var(--dimension-1rem); margin-bottom: var(--dimension-1_25rem); }
	.lobby-intro .page-heading { margin-bottom: 0; }
	.invite-panel { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--dimension-0_75rem) var(--dimension-1rem); padding-block: var(--dimension-0_85rem); }
	.invite-panel .eyebrow { margin-bottom: var(--dimension-0_25rem); }
	.room-id { min-width: 0; }
	.room-id .room-code { user-select: all; }
	.lobby-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .85fr); gap: var(--dimension-1rem); align-items: start; }
	.racer-count { margin-inline-start: var(--dimension-0_35rem); color: var(--muted); font: var(--text-0_8rem) var(--mono); }
	.roster { display: grid; gap: var(--dimension-0_45rem); margin-block: var(--dimension-1rem); }
	.roster-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--dimension-0_65rem); align-items: center; background: var(--inset); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); padding: var(--dimension-0_55rem) var(--dimension-0_65rem); }
	.initial { display: grid; place-items: center; background: var(--surface); color: var(--accent); border-radius: var(--radius-0_45rem); width: var(--dimension-2rem); height: var(--dimension-2rem); font: var(--text-0_8rem) var(--mono); }
	.initial.local { background: var(--accent-wash); }
	.racer-name { font-weight: var(--weight-600); overflow-wrap: anywhere; }
	.racer-name small { margin-inline-start: var(--dimension-0_5rem); color: var(--muted); font: var(--text-0_72rem) var(--mono); }
	.lobby-actions { border-top: var(--dimension-1px) solid var(--line); padding-top: var(--dimension-1rem); gap: var(--dimension-0_75rem); }
	.vote-status { font-size: var(--text-0_88rem); }
	.vote-status .muted { margin-top: var(--dimension-0_2rem); font-size: var(--text-0_8rem); }

	@media (max-width: 46rem) {
		.lobby-intro, .lobby-grid { grid-template-columns: minmax(0, 1fr); }
		.lobby-intro .page-heading { margin-bottom: var(--dimension-0_2rem); }
	}
	.race-standings { display: grid; gap: var(--dimension-0_35rem); margin-block: var(--dimension-1_6rem) var(--dimension-2rem); }
	.finish-status {
		margin-inline-start: auto;
		display: flex;
		align-items: center;
		min-height: var(--dimension-1_75rem);
		padding: var(--dimension-0_25rem) var(--dimension-0_65rem);
		border-radius: var(--radius-0_4rem);
		background: var(--accent-wash);
		color: var(--muted);
		font-size: var(--text-0_875rem);
		line-height: var(--dimension-1_25rem);
		text-align: right;
	}
	.finish-status strong { color: var(--ink); font-weight: var(--weight-600); font-variant-numeric: tabular-nums; }
	.room-dialog { margin: auto; width: min(100% - var(--dimension-2rem), var(--dimension-30rem)); color: var(--ink); }
	.room-dialog::backdrop { background: var(--overlay-dialog); backdrop-filter: blur(var(--dimension-3px)); }
	.room-dialog table { width: 100%; margin-top: var(--dimension-1rem); text-align: left; font-size: var(--text-0_875rem); }
	.room-dialog th, .room-dialog td { padding: var(--dimension-0_5rem) var(--dimension-0_25rem); border-bottom: var(--dimension-1px) solid var(--line); overflow-wrap: anywhere; }
</style>
