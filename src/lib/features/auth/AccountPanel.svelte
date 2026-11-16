<script lang="ts">
	import { account, authRedirect } from "../../state/account.store";
	import { supabase } from "../../services/supabase";
	import { displayName as publicName } from "./display-name";
	import AccountDashboard from "./AccountDashboard.svelte";
	import GithubIcon from "../../components/icons/GithubIcon.svelte";
	import ArrowRightIcon from "../../components/icons/ArrowRightIcon.svelte";
	import MailIcon from "../../components/icons/MailIcon.svelte";
	import LockIcon from "../../components/icons/LockIcon.svelte";
	const fieldId = $props.id();
	let mode = $state<"signin" | "signup" | "reset">("signin");
	let email = $state("");
	let password = $state("");
	let displayName = $state("");
	let busy = $state(false);
	let message = $state("");
	let error = $state("");
	let passwordVisible = $state(false);
	let githubPending = $state(false);
	let signedIn = $derived(!!$account.session && !$account.recovering);
	let profileName = $derived(publicName($account.session?.user.user_metadata) || "Welcome back");

	async function signInWithGithub() {
		if (!supabase || busy) return;
		busy = true; githubPending = true; error = ""; message = "";
		try {
			const result = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: authRedirect() } });
			if (result.error) throw result.error;
		} catch (cause) { error = cause instanceof Error ? cause.message : "Could not connect to GitHub. Please try again."; }
		finally { busy = false; githubPending = false; }
	}

	async function submit() {
		if (!supabase || busy) return;
		busy = true; message = ""; error = "";
		try {
			if ($account.recovering) {
				const result = await supabase.auth.updateUser({ password });
				if (result.error) throw result.error;
				account.update(state => ({ ...state, recovering: false }));
				message = "Password updated.";
			} else if (mode === "signup") {
				const result = await supabase.auth.signUp({ email: email.trim(), password,
					options: { data: { display_name: displayName.trim() }, emailRedirectTo: authRedirect() } });
				if (result.error) throw result.error;
				message = result.data.session ? "" : "Check your email to confirm your account. Open the link in this browser.";
			} else if (mode === "reset") {
				const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect(true) });
				if (result.error) throw result.error;
				message = "If an account exists, a reset link is on its way. Open it in this browser.";
			} else {
				const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
				if (result.error) throw result.error;
			}
			password = "";
		} catch (cause) { error = cause instanceof Error ? cause.message : "Account request failed. Please retry."; }
		finally { busy = false; }
	}
	async function signOut() {
		if (!supabase || busy) return;
		busy = true; error = ""; message = "";
		try {
			const result = await supabase.auth.signOut({ scope: "local" });
			if (result.error) throw result.error;
			password = ""; message = "Signed out. You can keep practising as a guest.";
		} catch (cause) { error = cause instanceof Error ? cause.message : "Could not sign out. Please retry."; }
		finally { busy = false; }
	}
	function changeMode(next: typeof mode) { mode = next; password = ""; passwordVisible = false; error = ""; message = ""; }
</script>

{#snippet notices()}
	{#if $account.error}<p class="notice notice-error" role="alert">{$account.error}</p>{/if}
	{#if error}<p class="notice notice-error" role="alert">{error}</p>{/if}
	{#if message}<p class="notice" role="status">{message}</p>{/if}
{/snippet}

<section class="account-page" class:signed-in={signedIn} aria-labelledby="account-title">
	{#if signedIn}
		{@render notices()}
		{#key $account.session!.user.id}<AccountDashboard user={$account.session!.user} name={profileName} {busy} onsignout={signOut} />{/key}
	{:else}
		<div class="account-intro">
			<p class="eyebrow">Your typing journey</p>
			<h1 id="account-title">Find your<br /><span>rhythm.</span></h1>
			<p class="intro-copy">A little practice. A new personal best.</p>
			<div class="typing-specimen" aria-hidden="true">
				<p class="specimen-label">one keystroke at a time</p>
				<p class="specimen-text"><span>keep</span> making<br />progress<span class="specimen-caret"></span></p>
				<div class="specimen-keys">{#each ["a", "s", "d", "f", "j", "k", "l", ";"] as key}<span class:home-key={key === "f" || key === "j"}>{key}</span>{/each}</div>
			</div>
			<p class="intro-benefits">Your progress and preferences, on every device.</p>
		</div>
		<div class="account-entry">
			<div class="auth-card">
				{#if !supabase}
					<h2>Keep practising.</h2><p class="form-copy">Accounts are unavailable on this deployment. Your next practice is still a keystroke away.</p><a tabindex="0" class="button button-primary" href="#/">Continue as guest</a>
				{:else if !$account.ready}
					<p role="status">Restoring your session…</p>
				{:else}
					{#if !$account.recovering && mode !== "reset"}
						<div class="auth-switch" role="group" aria-label="Account access">
							<button tabindex="0" disabled={busy} aria-pressed={mode === "signin"} onclick={() => changeMode("signin")}>Sign in</button>
							<button tabindex="0" disabled={busy} aria-pressed={mode === "signup"} onclick={() => changeMode("signup")}>Create account</button>
						</div>
					{/if}
					<div class="form-heading"><h2>{$account.recovering ? "Choose a new password." : mode === "reset" ? "Forgot your password?" : mode === "signup" ? "Make it your own." : "Welcome back."}</h2>{#if $account.recovering || mode === "reset"}<p class="form-copy">{$account.recovering ? "Choose a strong password for a fresh start." : "We'll send you a link to reset it."}</p>{/if}</div>
					{@render notices()}
					{#if !$account.recovering && mode !== "reset"}
						<button tabindex="0" class="github-button" type="button" disabled={busy} onclick={signInWithGithub}><GithubIcon /><span>{githubPending ? "Connecting to GitHub…" : "Continue with GitHub"}</span></button>
						<div class="auth-divider"><span>or continue with email</span></div>
					{/if}
					<form class="auth-form" onsubmit={event => { event.preventDefault(); void submit(); }}>
						{#if mode === "signup" && !$account.recovering}
							<label class="field">Display name<input tabindex="0" disabled={busy} required maxlength="50" autocomplete="nickname" placeholder="What should we call you?" bind:value={displayName} /></label>
						{/if}
						{#if !$account.recovering}
							<div class="field"><label for={`${fieldId}-email`}>Email</label><div class="input-shell focus-field"><MailIcon /><input tabindex="0" id={`${fieldId}-email`} disabled={busy} required type="email" autocomplete="email" placeholder="you@example.com" bind:value={email} /></div></div>
						{/if}
						{#if mode !== "reset" || $account.recovering}
							<div class="field"><div class="field-label"><label for={`${fieldId}-password`}>{$account.recovering ? "New password" : "Password"}</label>{#if mode === "signin" && !$account.recovering}<button tabindex="0" class="text-action forgot-password" type="button" disabled={busy} onclick={() => changeMode("reset")}>Forgot password?</button>{/if}</div><div class="input-shell focus-field"><LockIcon /><input tabindex="0" id={`${fieldId}-password`} disabled={busy} required type={passwordVisible ? "text" : "password"} minlength={mode === "signup" || $account.recovering ? 8 : 1} autocomplete={mode === "signup" || $account.recovering ? "new-password" : "current-password"} placeholder={mode === "signup" || $account.recovering ? "At least 8 characters" : "Enter your password"} bind:value={password} /><button tabindex="0" class="password-toggle" type="button" disabled={busy} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onclick={() => { passwordVisible = !passwordVisible; }}>{passwordVisible ? "Hide" : "Show"}</button></div></div>
						{/if}
						<button tabindex="0" class="button button-primary submit-button" type="submit" disabled={busy}><span>{busy ? "Please wait…" : $account.recovering ? "Update password" : mode === "signup" ? "Register" : mode === "reset" ? "Send reset link" : "Sign in to account"}</span><ArrowRightIcon /></button>
					</form>
					{#if !$account.recovering && mode !== "signin"}<button tabindex="0" class="text-action back-to-signin" disabled={busy} onclick={() => changeMode("signin")}>Back to sign in</button>{/if}
				{/if}
			</div>
			<p class="guest-link">Just here to type? <a tabindex="0" href="#/">Continue as guest <ArrowRightIcon /></a></p>
		</div>
	{/if}
</section>

<style>
	.account-page { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: clamp(var(--dimension-2rem), var(--dimension-7vw), var(--dimension-6rem)); padding-bottom: var(--dimension-1rem); }
	.account-intro { min-width: 0; }
	.account-intro h1 { margin: var(--dimension-1rem) 0 var(--dimension-0_85rem); font-size: clamp(var(--text-2_75rem), var(--text-4vw), var(--text-3_25rem)); line-height: var(--leading-1_06); font-weight: var(--weight-700); letter-spacing: var(--tracking-negative-_045em); }
	.account-intro h1 > span { color: var(--accent); }
	.intro-copy { color: var(--muted); font-size: var(--text-0_9rem); line-height: var(--leading-1_65); }
	.typing-specimen { margin-top: var(--dimension-1_5rem); padding-block: var(--dimension-1rem); border-block: var(--dimension-1px) solid var(--line); }
	.specimen-label { color: var(--muted); font: var(--weight-400) var(--text-0_72rem) var(--mono); }
	.specimen-text { margin-block: var(--dimension-0_75rem) var(--dimension-1rem); font-family: var(--mono); font-size: clamp(var(--text-1_45rem), var(--text-2_5vw), var(--text-2rem)); line-height: var(--leading-1_2); color: var(--muted); letter-spacing: var(--tracking-negative-_045em); }
	.specimen-text > span:first-child { color: var(--ink); }
	.specimen-caret { display: inline-block; height: var(--dimension-1em); width: var(--dimension-2px); background: var(--caret); vertical-align: text-bottom; margin-left: var(--dimension-0_15rem); }
	.specimen-keys { display: flex; gap: var(--dimension-0_35rem); }
	.specimen-keys > span { display: grid; place-items: center; width: var(--dimension-2_25rem); height: var(--dimension-2_25rem); border: var(--dimension-1px) solid var(--line); border-bottom-width: var(--dimension-3px); border-radius: var(--radius-0_45rem); color: var(--muted); font: var(--text-0_82rem) var(--mono); background: var(--surface); }
	.specimen-keys > .home-key { color: var(--accent); border-color: var(--accent); background: var(--accent-wash); }
	.intro-benefits { margin-top: var(--dimension-1rem); font-size: var(--text-0_82rem); color: var(--muted); }
	.account-entry { min-width: 0; }
	.auth-card { display: grid; gap: var(--dimension-0_85rem); padding: clamp(var(--dimension-1_25rem), var(--dimension-3_5vw), var(--dimension-1_5rem)); background: var(--surface); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-1rem); }
	.auth-switch { display: grid; grid-template-columns: 1fr 1fr; gap: var(--dimension-0_25rem); padding: var(--dimension-0_25rem); background: var(--inset); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_75rem); }
	.auth-switch button { padding: var(--dimension-0_6rem) var(--dimension-0_5rem); border-radius: var(--radius-0_5rem); color: var(--muted); font-size: var(--text-0_82rem); font-weight: var(--weight-600); transition: color var(--motion-160ms), background var(--motion-160ms); }
	.auth-switch button[aria-pressed="true"] { background: var(--accent-wash); color: var(--ink); }
	.auth-card h2 { font-size: var(--text-1_45rem); line-height: var(--leading-1_2); letter-spacing: var(--tracking-negative-_045em); font-weight: var(--weight-700); }
	.form-copy { margin-top: var(--dimension-0_65rem); color: var(--muted); font-size: var(--text-0_82rem); line-height: var(--leading-1_65); }
	.github-button { display: flex; align-items: center; justify-content: center; gap: var(--dimension-0_65rem); width: 100%; min-height: var(--dimension-3rem); padding: var(--dimension-0_75rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); font-size: var(--text-0_875rem); font-weight: var(--weight-600); transition: background var(--motion-160ms), border-color var(--motion-160ms); }
	.github-button :global(svg) { width: var(--dimension-1_25rem); height: var(--dimension-1_25rem); }
	.github-button:hover { background: var(--accent-wash); border-color: var(--muted); }
	.auth-divider { display: flex; align-items: center; gap: var(--dimension-0_75rem); color: var(--muted); font: var(--text-0_72rem) var(--mono); }
	.auth-divider::before, .auth-divider::after { content: ""; height: var(--dimension-1px); flex: 1; background: var(--line); }
	.auth-form { display: grid; gap: var(--dimension-1rem); }
	.auth-form .field { font-size: var(--text-0_82rem); gap: var(--dimension-0_45rem); }
	.field-label { display: flex; justify-content: space-between; align-items: baseline; gap: var(--dimension-0_5rem); }
	.input-shell { display: flex; align-items: center; border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); min-width: 0; }
	.input-shell > :global(svg) { margin-left: var(--dimension-0_85rem); flex: none; color: var(--muted); }
	.input-shell input { min-width: 0; border: 0; background: transparent; padding: var(--dimension-0_75rem); font-size: var(--text-0_875rem); }
	.password-toggle { flex: none; align-self: stretch; padding-inline: var(--dimension-0_75rem); color: var(--muted); font: var(--text-0_72rem) var(--mono); border-radius: var(--radius-0_45rem); }
	.password-toggle:hover { color: var(--ink); }
	.text-action { text-align: left; text-decoration: underline; text-underline-offset: var(--dimension-3px); color: var(--accent); font-size: var(--text-0_82rem); }
	.forgot-password { font-size: var(--text-0_72rem); font-weight: var(--weight-400); }
	.submit-button { width: 100%; min-height: var(--dimension-3rem); margin-top: var(--dimension-0_25rem); justify-content: space-between; padding-inline: var(--dimension-1rem); }
	.back-to-signin { justify-self: center; }
	.guest-link { margin-top: var(--dimension-0_85rem); text-align: center; color: var(--muted); font-size: var(--text-0_75rem); line-height: var(--leading-1_65); }
	.guest-link a { display: inline-flex; align-items: center; gap: var(--dimension-0_25rem); margin-left: var(--dimension-0_25rem); color: var(--ink); }
	.guest-link a:hover { color: var(--accent); }
	.guest-link :global(svg) { width: var(--dimension-1rem); height: var(--dimension-1rem); }
	.notice { padding: var(--dimension-0_75rem) var(--dimension-0_85rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); font-size: var(--text-0_82rem); line-height: var(--leading-1_65); overflow-wrap: anywhere; }
	.notice-error { color: var(--error); border-color: currentColor; }
	.signed-in { display: block; }
	.signed-in > .notice { margin-bottom: var(--dimension-1rem); }
	button:disabled { cursor: not-allowed; }
	@media (max-width: 48rem) {
		.account-page { grid-template-columns: minmax(0, 1fr); gap: var(--dimension-1_25rem); }
		.account-intro h1 { font-size: var(--text-2rem); margin-block: var(--dimension-0_85rem) var(--dimension-0_75rem); }
		.account-intro h1 br { display: none; }
		.account-intro h1 > span::before { content: " "; }
		.account-intro .eyebrow { font-size: var(--text-0_7rem); }
		.typing-specimen, .intro-benefits { display: none; }
		.auth-card { padding: var(--dimension-1_25rem); }
	}
	@media (max-width: 360px) {
		.account-intro h1 { font-size: var(--text-2rem); }
		.field-label { flex-wrap: wrap; }
		.auth-switch button { font-size: var(--text-0_75rem); padding-inline: var(--dimension-0_25rem); white-space: nowrap; }
		.guest-link a { margin-left: 0; }
	}
</style>
