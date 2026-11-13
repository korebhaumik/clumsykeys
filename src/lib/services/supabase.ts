import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../backend/src/database.types";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabaseConfigError = !!url !== !!key ? "Account configuration is incomplete. Set both public Supabase variables." : "";
export const supabase = url && key ? createClient<Database>(url, key, {
	auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
	global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
}) : null;
