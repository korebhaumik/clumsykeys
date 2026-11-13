import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

export function loadEnvironment() {
	// Source and compiled server both live one directory beneath backend/.
	const rootEnv = resolve(__dirname, "../../.env");
	if (existsSync(rootEnv)) loadEnvFile(rootEnv);
}

export function readSupabaseConfig(env: NodeJS.ProcessEnv) {
	const url = env.SUPABASE_URL?.trim();
	const secret = env.SUPABASE_SECRET_KEY?.trim();
	if (!url && !secret) return;
	if (!url || !secret) throw new Error("Set both SUPABASE_URL and SUPABASE_SECRET_KEY, or leave both unset for guest-only mode.");
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:" && !(["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.protocol === "http:")) throw new Error();
	} catch { throw new Error("SUPABASE_URL must be an HTTPS project URL (HTTP is allowed for local tests)."); }
	return { url, secret };
}
