import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { AccountDashboard, AccountData, Json, PracticeSubmission, PracticeSummary, RaceArchive, RaceResult } from "./persistence.contract";
import { parsePreferences } from "./persistence.contract";

export class PersistenceError extends Error {
	constructor(public status: number, message: string) { super(message); }
}
import type { LeaderboardFilters, LeaderboardPage } from "./leaderboard.contract";

type Identity = { id: string; expiresAt: number };
export type Persistence = {
	leaderboard(filters: LeaderboardFilters, viewer: string | null): Promise<LeaderboardPage>;
	verify(token: string): Promise<Identity>;
	account(userId: string): Promise<AccountData>;
	saveHandle(userId: string, handle: string): Promise<string>;
	dashboard(userId: string): Promise<AccountDashboard>;
	savePreferences(userId: string, data: Json, revision: number): Promise<number>;
	savePractice(userId: string, result: PracticeSubmission): Promise<void>;
	practiceHistory(userId: string, offset: number): Promise<PracticeSummary[]>;
	practiceDetail(userId: string, id: string): Promise<{ summary: PracticeSummary; samples: Json; history: Json } | null>;
	raceHistory(userId: string, offset: number): Promise<RaceResult[]>;
	raceDetail(userId: string, id?: string): Promise<{ round: Json; results: Json; ownRacerId: string } | null>;
	saveRace(round: RaceArchive): Promise<void>;
};

export function createSupabasePersistence(config: { url: string; secret: string }): Persistence {
	const client = createClient<Database>(config.url, config.secret, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
		global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
	});
	function check(error: { code?: string } | null) {
		if (error) throw new PersistenceError(error.code === "40001" ? 409 : error.code === "23505" ? 409 : 503,
			error.code === "40001" ? "Preferences changed on another device. Reload account settings before saving again."
				: error.code === "23505" ? "Result identity conflict." : "Database unavailable. Please retry.");
	}
	return {
		async leaderboard(filters, viewer) {
			const { data, error } = await client.rpc("read_solo_leaderboard", { p_filters: filters, p_viewer: viewer ?? undefined });
			check(error); return data as unknown as LeaderboardPage;
		},
		async verify(token) {
			const { data, error } = await client.auth.getUser(token);
			if (error && (!error.status || error.status >= 500)) throw new PersistenceError(503, "Account verification is temporarily unavailable. Please retry.");
			if (error || !data.user) throw new PersistenceError(401, "Your session has expired. Please sign in again.");
			// getUser verifies the token; decode only its verified expiration claim.
			let expiresAt: number;
			try { expiresAt = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp * 1000; }
			catch { throw new PersistenceError(401, "Invalid session."); }
			if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new PersistenceError(401, "Session expired.");
			return { id: data.user.id, expiresAt };
		},
		async account(userId) {
			const [profile, preferences] = await Promise.all([
				client.from("profiles").select("display_name, handle").eq("id", userId).maybeSingle(),
				client.from("user_preferences").select("data, revision").eq("user_id", userId).maybeSingle(),
			]);
			check(profile.error); check(preferences.error);
			return { displayName: profile.data?.display_name ?? "", handle: profile.data?.handle ?? null, preferences: parsePreferences(preferences.data?.data) ?? null,
				revision: preferences.data?.revision ?? 0 };
		},
		async saveHandle(userId, handle) {
			const { data, error } = await client.rpc("save_account_handle", { p_user_id: userId, p_handle: handle });
			if (error?.code === "23505") throw new PersistenceError(409, "Handle already taken. Choose another handle.");
			check(error); return data!;
		},
		async dashboard(userId) {
			const { data, error } = await client.rpc("read_account_dashboard", { p_user_id: userId });
			check(error); return data as unknown as AccountDashboard;
		},
		async savePreferences(userId, data, revision) {
			const result = await client.rpc("save_account_preferences", { p_user_id: userId, p_data: data, p_revision: revision });
			check(result.error); return result.data!;
		},
		async savePractice(userId, result) {
			const { error } = await client.rpc("save_practice_result", { p_user_id: userId, p_result: result as unknown as Json });
			check(error);
		},
		async practiceHistory(userId, offset) {
			const { data, error } = await client.from("practice_results").select("*").eq("user_id", userId)
				.order("created_at", { ascending: false }).order("id").range(offset, offset + 19);
			check(error); return data ?? [];
		},
		async practiceDetail(userId, id) {
			const summary = await client.from("practice_results").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
			check(summary.error);
			if (!summary.data) return null;
			const detail = await client.from("practice_result_details").select("samples, history").eq("result_id", id).single();
			check(detail.error); return { summary: summary.data, samples: detail.data!.samples, history: detail.data!.history };
		},
		async raceHistory(userId, offset) {
			const { data, error } = await client.from("race_results").select("*").eq("account_id", userId)
				.order("created_at", { ascending: false }).order("round_id").range(offset, offset + 19);
			check(error); return data ?? [];
		},
		async raceDetail(userId, id) {
			let query = client.from("race_results").select("round_id, racer_id").eq("account_id", userId);
			if (id) query = query.eq("round_id", id);
			const owned = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
			check(owned.error); if (!owned.data) return null;
			const roundId = owned.data.round_id;
			const [round, results] = await Promise.all([
				client.from("race_rounds").select("*").eq("id", roundId).single(),
				// Exclude account UUIDs and internal participant IDs from shared scoreboards.
				client.from("race_results").select("racer_id, username, wpm, accuracy, finish_seconds, reason, speed_history").eq("round_id", roundId),
			]);
			check(round.error); check(results.error);
			return { round: round.data as unknown as Json, results: results.data as unknown as Json, ownRacerId: owned.data.racer_id };
		},
		async saveRace(round) {
			const { error } = await client.rpc("save_race_round", { p_round: round as unknown as Json }); check(error);
		},
	};
}
