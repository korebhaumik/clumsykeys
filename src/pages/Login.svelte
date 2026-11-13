<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import socket from "../lib/features/multiplayer/socket";
	import { push, router } from "svelte-spa-router";

	const userId = uuidv4();
	let username = $state("");
	let roomId = $state("");

	$effect(() => {
		roomId = new URLSearchParams(router.querystring).get("room") ?? "";
	});

	function handleUser() {
		const prevId = localStorage.getItem("userId");
		if (!prevId) localStorage.setItem("userId", userId);
		localStorage.setItem("username", username);
		localStorage.setItem("roomId", roomId);
	}

	function handleSubmit() {
		username = username.trim();
		roomId = roomId.trim();
		if (!username || !roomId) return;
		handleUser();
		socket.disconnect();
		push("/race");
	}
</script>

<div class="join-layout">
	<section aria-labelledby="join-title">
		<div class="page-heading">
			<p class="eyebrow">Multiplayer typing</p>
			<h1 id="join-title">Find your typing room.</h1>
			<p class="lede">Race friends through the same passage and follow each other’s speed and accuracy live.</p>
		</div>
		<nav class="practice-links" aria-label="Solo practice">
			<a href="#/game"><span class="practice-icon" aria-hidden="true">&lt;/&gt;</span><span>Practice code</span><span aria-hidden="true">→</span></a>
			<a href="#/"><span class="practice-icon" aria-hidden="true">Aa</span><span>Practice prose</span><span aria-hidden="true">→</span></a>
		</nav>
	</section>

	<section class="panel join-panel" aria-labelledby="room-access">
		<p class="eyebrow">Room access</p>
		<h2 class="panel-title" id="room-access">Join a room</h2>
		<p class="muted">Pick a room ID or use one a friend shared.</p>
		<form class="stack" onsubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
			<label class="field">
				Username
				<input type="text" placeholder="e.g. Ada" required autocomplete="nickname" bind:value={username} />
			</label>
			<label class="field">
				Room ID
				<input type="text" placeholder="e.g. weekend-race" required autocomplete="off" bind:value={roomId} />
			</label>
			<button class="button button-primary" type="submit">
				Join room <span aria-hidden="true">→</span>
			</button>
			<p class="muted">Guest rooms work without an account. <a href="#/account">Sign in</a> to save your races.</p>
		</form>
	</section>
</div>

<style>
	.join-layout { display: grid; grid-template-columns: 1fr minmax(var(--dimension-19rem), .8fr); align-items: start; gap: clamp(var(--dimension-2rem), var(--dimension-7vw), var(--dimension-6rem)); }
	.join-panel > .muted { margin: var(--dimension-0_35rem) 0 var(--dimension-1_3rem); font-size: var(--text-0_9rem); }
	.join-panel .button { margin-top: var(--dimension-0_2rem); }
	.practice-links { display: flex; flex-wrap: wrap; gap: var(--dimension-0_55rem); }
	.practice-links a { display: inline-flex; align-items: center; gap: var(--dimension-0_55rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); padding: var(--dimension-0_5rem) var(--dimension-0_65rem); font-size: var(--text-0_82rem); }
	.practice-links a:hover { background: var(--surface); }
	.practice-links a > :last-child { color: var(--muted); }
	.practice-icon { color: var(--accent); font: 600 var(--text-0_8rem) var(--mono); }
	@media (max-width: 48rem) { .join-layout { grid-template-columns: 1fr; } }
</style>
