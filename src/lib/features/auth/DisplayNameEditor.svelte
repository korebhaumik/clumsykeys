<script lang="ts">
	import { displayName } from "./display-name";
	import { tick } from "svelte";
	import { get } from "svelte/store";
	import { account } from "../../state/account.store";
	import { supabase } from "../../services/supabase";
	let { name, accountId }: { name: string; accountId: string } = $props();
	let editing = $state(false), draft = $state(""), saving = $state(false), error = $state(""), message = $state("");
	let input = $state<HTMLInputElement>();
	let editButton = $state<HTMLButtonElement>();
	async function close() { editing = false; error = ""; await tick(); editButton?.focus(); }
	async function edit() { draft = displayName(get(account).session?.user.user_metadata); editing = true; message = ""; error = ""; await tick(); input?.focus(); }
	async function save() {
		if (!supabase || saving || get(account).session?.user.id !== accountId) return;
		const value = draft.trim();
		if (!value || Array.from(value).length > 50 || value.includes("@")) { error = "Use 1–50 characters without an @ sign."; return; }
		saving = true; error = ""; message = "";
		try {
			const result = await supabase.auth.updateUser({ data: { display_name: value } });
			if (result.error) throw result.error;
			if (get(account).session?.user.id !== accountId) return;
			message = "Display name saved."; await close();
		} catch { error = "Could not save your display name. Please retry."; }
		finally { saving = false; }
	}
</script>

<div class="name-row">
	<h2 aria-label={name}>{#if editing}{name}{:else}<button tabindex="0" class="edit-name" type="button" aria-label={`Edit display name: ${name}`} title="Double-click to edit display name" bind:this={editButton} onclick={event => { if (event.detail === 0 || event.detail === 2) void edit(); }}>{name}</button>{/if}</h2>
</div>
{#if editing}
	<form class="name-editor" onsubmit={event => { event.preventDefault(); void save(); }}>
		<label>Display name<input tabindex="0" required maxlength="50" autocomplete="nickname" bind:this={input} bind:value={draft} disabled={saving} /></label>
		<p>Your public name on leaderboards. You can choose a separate alias when joining a room.</p>
		<div><button tabindex="0" class="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save display name"}</button><button tabindex="0" class="button button-secondary" type="button" disabled={saving} onclick={close}>Cancel</button></div>
	</form>
{/if}
{#if error}<p role="alert">{error}</p>{/if}
{#if message}<p role="status">{message}</p>{/if}

<style>
	.name-editor { display: grid; gap: var(--dimension-0_75rem); width: 100%; max-width: var(--dimension-30rem); margin-inline: auto; margin-block: var(--dimension-0_75rem); text-align: left; }
	.name-row { text-align: center; margin-top: var(--dimension-0_5rem); }
	h2 { min-width: 0; font-size: var(--text-1_8rem); letter-spacing: var(--tracking-negative-_045em); overflow-wrap: anywhere; }
	.edit-name { max-width: 100%; font: inherit; letter-spacing: inherit; color: inherit; text-align: inherit; overflow-wrap: anywhere; border-radius: var(--radius-0_3rem); touch-action: manipulation; }
	.edit-name:hover { background: var(--accent-wash); color: var(--accent); text-decoration: underline; text-underline-offset: var(--dimension-3px); }
	input { width: 100%; min-width: 0; padding: var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); color: var(--ink); }
	label { display: grid; gap: var(--dimension-0_5rem); }
	.name-editor > div { display: flex; flex-wrap: wrap; gap: var(--dimension-0_5rem); }
	p { font-size: var(--text-0_82rem); color: var(--muted); }
	[role="alert"] { color: var(--error); }
	@media (max-width: 48rem) { h2 { font-size: var(--text-1_45rem); } }
</style>
