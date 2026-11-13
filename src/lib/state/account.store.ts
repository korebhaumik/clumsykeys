import type { Session } from "@supabase/supabase-js";
import { writable } from "svelte/store";
import { supabase, supabaseConfigError } from "../services/supabase";

export const account = writable<{ session: Session | null; ready: boolean; recovering: boolean; error: string }>({
	session: null, ready: !supabase, recovering: false, error: supabaseConfigError,
});

export function authRedirect(recovery = false) {
	const url = new URL(window.location.href);
	url.hash = ""; url.search = recovery ? "?auth_action=recovery" : "?auth_action=confirm";
	return url.href;
}

export async function initializeAccount() {
	if (!supabase) return () => {};
	let active = true;
	const client = supabase;
	const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
		if (!active) return;
		account.update(state => ({ ...state, session, ready: true,
			recovering: event === "PASSWORD_RECOVERY" || (event !== "SIGNED_OUT" && state.recovering),
			error: session || event === "SIGNED_OUT" ? "" : state.error }));
	});
	try {
		const url = new URL(window.location.href);
		const code = url.searchParams.get("code");
		if (code) {
			const recovering = url.searchParams.get("auth_action") === "recovery";
			const { data, error } = await client.auth.exchangeCodeForSession(code);
			if (error) throw error;
			if (active) account.set({ session: data.session, ready: true, recovering, error: "" });
			url.searchParams.delete("code"); url.searchParams.delete("auth_action"); url.hash = "/account";
			window.history.replaceState(null, "", url);
		} else if (url.searchParams.has("error_description")) {
			throw new Error("This account link is invalid or expired. Request a new link.");
		} else {
			const { data, error } = await client.auth.getSession();
			if (error) throw error;
			if (active) account.update(state => ({ ...state, session: data.session, ready: true }));
		}
	} catch {
		const url = new URL(window.location.href);
		const callbackError = url.searchParams.has("error_description") && !url.searchParams.has("code");
		if (active) account.update(state => ({ ...state, ready: true, error: callbackError
			? "Sign-in wasn't completed. Please try again or continue with email."
			: "Could not restore your account. Sign in again or request a fresh email link." }));
		if (url.searchParams.has("code") || url.searchParams.has("error_description")) {
			for (const key of ["code", "auth_action", "error", "error_code", "error_description"]) url.searchParams.delete(key);
			url.hash = "/account"; window.history.replaceState(null, "", url);
		}
	}
	return () => { active = false; subscription.unsubscribe(); };
}
