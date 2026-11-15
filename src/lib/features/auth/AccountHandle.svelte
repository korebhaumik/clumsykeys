<script lang="ts">
	import { tick } from "svelte";
	import { accountApi } from "../../services/account-api";
	import { parseHandle, type AccountData } from "../../../../backend/src/persistence.contract";
	let { accountId }: { accountId: string } = $props();
	let handle = $state<string | null>(null), draft = $state("");
	let loading = $state(true), saving = $state(false), editing = $state(false);
	let error = $state(""), message = $state("");
	let retry = $state(0);
	let input = $state<HTMLInputElement>();
	let button = $state<HTMLButtonElement>();
	$effect(() => {
		const owner = accountId; void retry;
		let active = true;
		loading = true; error = "";
		void accountApi<AccountData>("/api/account", { accountId: owner }).then(data => {
			if (active) { handle = data.handle; loading = false; }
		}).catch(() => { if (active) { loading = false; error = "Could not load your handle. Please retry."; } });
		return () => { active = false; };
	});
	async function edit() { draft = handle ?? ""; editing = true; error = ""; message = ""; await tick(); input?.focus(); }
	async function close() { editing = false; error = ""; await tick(); button?.focus(); }
	async function save() {
		if (saving) return;
		const normalized = parseHandle(draft);
		if (!normalized) { error = "Use 3–24 letters, numbers or underscores."; return; }
		saving = true; error = ""; message = "";
		try {
			const result = await accountApi<{ handle: string }>("/api/account/handle", { method: "PUT", body: { handle: normalized }, accountId });
			handle = result.handle; message = "Handle saved."; await close();
		} catch (cause) { error = cause instanceof Error ? cause.message : "Could not save your handle. Please retry."; }
		finally { saving = false; }
	}
</script>

<div class="account-handle">
	{#if loading}<p role="status">Loading handle…</p>
	{:else if editing}
		<form onsubmit={event => { event.preventDefault(); void save(); }}>
			<label>Unique handle<input bind:this={input} bind:value={draft} required minlength="3" maxlength="24" autocomplete="username" autocapitalize="none" spellcheck="false" disabled={saving} aria-describedby="handle-help" /></label>
			<p id="handle-help">3–24 letters, numbers or underscores. Handles ignore capitalization. Your display name and room alias can be different.</p>
			<div class="actions"><button class="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save handle"}</button><button type="button" class="button button-secondary" disabled={saving} onclick={close}>Cancel handle edit</button></div>
		</form>
	{:else if !error}
		{#if handle}
			<button class="handle-name" type="button" bind:this={button} aria-label={`Edit handle: @${handle}`} title="Double-click to edit handle" onclick={event => { if (event.detail === 0 || event.detail === 2) void edit(); }}>@{handle}</button>
		{:else}<button class="handle-action" bind:this={button} onclick={edit}>Choose a unique handle</button>{/if}
	{/if}
	{#if error}<p class="error" role="alert">{error}</p>{#if !editing}<button onclick={() => retry++}>Retry handle</button>{/if}{/if}
	{#if message}<p role="status">{message}</p>{/if}
</div>

<style>
	.account-handle { margin-top: var(--dimension-0_5rem); font-size: var(--text-0_82rem); }
	.handle-name { max-width: 100%; color: var(--accent); overflow-wrap: anywhere; border-radius: var(--radius-0_3rem); touch-action: manipulation; }
	.handle-name:hover { background: var(--accent-wash); text-decoration: underline; text-underline-offset: var(--dimension-3px); }
	.handle-action { color: var(--accent); text-decoration: underline; text-underline-offset: var(--dimension-3px); }
	form { display: grid; gap: var(--dimension-0_75rem); max-width: var(--dimension-30rem); margin: var(--dimension-0_75rem) auto; text-align: left; }
	label { display: grid; gap: var(--dimension-0_5rem); }
	input { width: 100%; min-width: 0; padding: var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); color: var(--ink); }
	form p { color: var(--muted); }
	.actions { display: flex; flex-wrap: wrap; gap: var(--dimension-0_5rem); }
	.error { color: var(--error); }
</style>
