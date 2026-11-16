<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import socket from "../lib/features/multiplayer/socket";
	import { push, router } from "svelte-spa-router";
	import RocketIcon from "../lib/components/icons/RocketIcon.svelte";
	import UserIcon from "../lib/components/icons/UserIcon.svelte";
	import HashIcon from "../lib/components/icons/HashIcon.svelte";
	import { account } from "../lib/state/account.store";
	import { displayName } from "../lib/features/auth/display-name";
	import RacePreview from "../lib/features/multiplayer/RacePreview.svelte";

	const userId = uuidv4();
	let username = $state("");
	let roomId = $state("");
	let edited = $state(false);
	let owner = $state<string | undefined>();
	$effect(() => {
		const current = $account.session?.user;
		if (owner !== current?.id) { owner = current?.id; edited = false; }
		if (!edited) username = displayName(current?.user_metadata);
	});

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
			<h1 id="join-title">Find your typing <span>room.</span></h1>
			<p class="lede">Race friends through the same passage and follow each other’s speed and accuracy live.</p>
			<RacePreview />
		</div>
		<nav class="practice-links" aria-label="Solo practice">
			<a tabindex="0" href="#/game"><span class="practice-icon" aria-hidden="true">&lt;/&gt;</span><span>Practice code</span><span aria-hidden="true">→</span></a>
			<a tabindex="0" href="#/"><span class="practice-icon" aria-hidden="true">Aa</span><span>Practice prose</span><span aria-hidden="true">→</span></a>
		</nav>
	</section>

	<section class="panel join-panel" aria-labelledby="room-access">
		<span class="room-emblem" aria-hidden="true"><RocketIcon /></span>
		<p class="eyebrow">Room access</p>
		<h2 class="panel-title" id="room-access">Join a room</h2>
		<p class="muted">Pick a room ID or use one a friend shared.</p>
		<form class="stack" onsubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
			<label class="field">
				Username
				<span class="join-input"><UserIcon /><input tabindex="0" type="text" placeholder="e.g. Ada" required maxlength="50" autocomplete="nickname" oninput={() => edited = true} bind:value={username} /></span>
			</label>
			<label class="field">
				Room ID
				<span class="join-input"><HashIcon /><input tabindex="0" type="text" placeholder="e.g. weekend-race" required autocomplete="off" bind:value={roomId} /></span>
			</label>
			<button tabindex="0" class="button button-primary" type="submit">
				Join room <span aria-hidden="true">→</span>
			</button>
			{#if $account.ready && !$account.session}
				<p class="muted join-note">Guest rooms work without an account. <a tabindex="0" href="#/account">Sign in</a> to save your races.</p>
			{/if}
		</form>
	</section>
</div>

<style>
	.join-layout { display: grid; grid-template-columns: 1fr minmax(var(--dimension-19rem), .8fr); align-items: start; gap: clamp(var(--dimension-2rem), var(--dimension-7vw), var(--dimension-6rem)); }
	.page-heading h1 span { color: var(--accent); }
	.join-panel { position: relative; border-color: color-mix(in srgb, var(--line) 60%, transparent); background: linear-gradient(145deg, var(--surface), color-mix(in srgb, var(--surface) 80%, var(--inset))); }
	.room-emblem { position: absolute; top: clamp(var(--dimension-1rem), var(--dimension-3_5vw), var(--dimension-1_65rem)); right: clamp(var(--dimension-1rem), var(--dimension-3_5vw), var(--dimension-1_65rem)); display: grid; place-items: center; width: var(--dimension-2_5rem); height: var(--dimension-2_5rem); border: var(--dimension-1px) solid color-mix(in srgb, var(--accent) 25%, transparent); border-radius: var(--radius-0_75rem); background: var(--accent-wash); color: var(--accent); }
	.join-input { display: grid; position: relative; }
	.join-input :global(svg) { position: absolute; top: 50%; left: var(--dimension-0_9rem); transform: translateY(-50%); width: var(--dimension-1rem); height: var(--dimension-1rem); color: var(--muted); pointer-events: none; }
	.join-input input { padding-inline-start: var(--dimension-2_5rem); border-color: color-mix(in srgb, var(--line) 65%, transparent); }
	.join-input:focus-within :global(svg) { color: var(--accent); }
	.join-note { position: relative; }
	.join-note::before { content: ""; position: absolute; top: calc(-1 * var(--dimension-0_5rem)); inset-inline: 0; height: var(--dimension-1px); background: color-mix(in srgb, var(--line) 35%, transparent); }
	.join-note a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: var(--dimension-3px); white-space: nowrap; }
	.join-panel > .muted { margin: var(--dimension-0_35rem) 0 var(--dimension-1_3rem); font-size: var(--text-0_9rem); }
	.join-panel .button { margin-top: var(--dimension-0_2rem); }
	.practice-links { display: flex; flex-wrap: wrap; gap: var(--dimension-0_55rem); }
	.practice-links a { display: inline-flex; align-items: center; gap: var(--dimension-0_55rem); border: var(--dimension-1px) solid color-mix(in srgb, var(--line) 65%, transparent); border-radius: var(--radius-0_55rem); padding: var(--dimension-0_5rem) var(--dimension-0_65rem); font-size: var(--text-0_82rem); background: color-mix(in srgb, var(--surface) 60%, transparent); }
	.practice-links a:hover { background: var(--accent-wash); border-color: var(--accent); }
	.practice-links a > :last-child { color: var(--muted); }
	.practice-icon { color: var(--accent); font: 600 var(--text-0_8rem) var(--mono); }
	@media (max-width: 48rem) { .join-layout { grid-template-columns: 1fr; } }
</style>
