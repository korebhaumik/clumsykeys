import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../backend/src/database.types";
import { publicSupabaseError } from "./public-config";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabaseConfigError = publicSupabaseError(url, key);
export const supabase = url && key && !supabaseConfigError ? createClient<Database>(url, key, {
	auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
	global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
}) : null;
