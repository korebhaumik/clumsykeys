import { get } from "svelte/store";
import { account } from "../state/account.store";
import { supabase } from "./supabase";
import { serverUrl } from "./server";

export class AccountApiError extends Error {
	constructor(public status: number, message: string) { super(message); }
}

export async function accountApi<T>(path: string, options: { method?: string; body?: unknown; accountId?: string } = {}): Promise<T> {
	const initialId = options.accountId ?? get(account).session?.user.id;
	if (!supabase || !initialId) throw new AccountApiError(401, "Sign in to access your saved data.");
	const { data, error } = await supabase.auth.getSession();
	if (error || !data.session || data.session.user.id !== initialId || get(account).session?.user.id !== initialId) {
		throw new AccountApiError(401, "Your account session changed. Sign in to the original account to retry.");
	}
	let response: Response;
	try {
		response = await fetch(`${serverUrl}${path}`, { method: options.method ?? "GET",
			headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
			body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: AbortSignal.timeout(15_000) });
	} catch { throw new AccountApiError(503, "Could not reach the account server. Please retry."); }
	const result = await response.json().catch(() => ({}));
	if (!response.ok) throw new AccountApiError(response.status, result.error ?? "Account request failed.");
	if (get(account).session?.user.id !== initialId) throw new AccountApiError(401, "Your account session changed.");
	return result;
}
