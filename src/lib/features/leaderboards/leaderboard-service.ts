import type { LeaderboardFilters, LeaderboardPage } from "./leaderboard";
import { filterQuery } from "./leaderboard";
import { serverUrl } from "../../services/server";
import { supabase } from "../../services/supabase";

export interface LeaderboardService {
	readonly isDemo: boolean;
	read(filters: LeaderboardFilters, userId: string | null, signal: AbortSignal): Promise<LeaderboardPage>;
}
export const previewUserId = "solo-preview-player";
export const leaderboardService: LeaderboardService = {
	isDemo: false,
	async read(filters, userId, signal) {
		const headers: Record<string, string> = {};
		if (userId) {
			const session = await supabase?.auth.getSession();
			if (!session?.data.session || session.data.session.user.id !== userId) throw new Error("Your session changed. Please sign in again.");
			headers.Authorization = `Bearer ${session.data.session.access_token}`;
		}
		const response = await fetch(`${serverUrl}/api/leaderboards/solo?${filterQuery(filters)}`, {
			headers, signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error ?? "Could not load solo rankings. Please retry.");
		return result as LeaderboardPage;
	},
};
