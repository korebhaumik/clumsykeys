// Browser-safe checks shared by Vite and the account client. Never include key values in errors.
export function isPublicSupabaseKey(key: string) {
	if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
	try {
		const parts = key.split(".");
		return parts.length === 3 && JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "anon";
	} catch { return false; }
}

export function publicSupabaseError(url?: string, key?: string) {
	if (!url && !key) return "";
	if (!url || !key) return "Account configuration is incomplete. Set both public Supabase variables.";
	if (!isPublicSupabaseKey(key)) return "VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or anon key. Secret keys belong only on the server.";
	try {
		const parsed = new URL(url);
		if (parsed.username || parsed.password || (parsed.protocol !== "https:" &&
			!(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)))) throw new Error();
	} catch { return "VITE_SUPABASE_URL must use HTTPS (HTTP is allowed on loopback for local development)."; }
	return "";
}
