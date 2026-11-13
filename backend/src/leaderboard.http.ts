import type { Express } from "express";
import type { LeaderboardFilters } from "./leaderboard.contract";
import { PersistenceError, type Persistence } from "./persistence";

export function registerLeaderboardRoutes(app: Express, db?: Persistence) {
	app.get("/api/leaderboards/solo", async (req, res) => {
		res.set("Cache-Control", "no-store");
		try {
			if (!db) throw new PersistenceError(503, "Solo rankings are not configured on this server.");
			const { mode, language, test, length, range, page } = req.query;
			const formats = mode === "prose" ? ["time", "words", "quotes"] : mode === "dev" ? ["snippets", "keywords-time", "keywords-words"] : [];
			if (typeof language !== "string" || !language.length || language.length > 40 ||
				!formats.includes(String(test)) || typeof test !== "string" || typeof range !== "string" ||
				!["all", "month", "week", "day"].includes(range) || typeof length !== "string" ||
				!(/^\d{1,5}$/).test(length) || !(test === "quotes" || test === "snippets" ? [0] : test.endsWith("time") ? [15, 30, 60, 120] : [25, 50, 100, 200]).includes(Number(length)) ||
				typeof page !== "string" || !/^\d{1,7}$/.test(page) || Number(page) < 1 || Number(page) > 1_000_000) throw new PersistenceError(400, "Invalid solo leaderboard filters.");
			let viewer: string | null = null;
			if (req.headers.authorization) {
				const token = req.headers.authorization.match(/^Bearer ([^\s]+)$/)?.[1];
				if (!token || token.length > 8192) throw new PersistenceError(401, "Invalid account session.");
				viewer = (await db.verify(token)).id;
			}
			res.json(await db.leaderboard({ mode, language, test, length: Number(length), range, page: Number(page) } as LeaderboardFilters, viewer));
		} catch (error) {
			res.status(error instanceof PersistenceError ? error.status : 503).json({ error: error instanceof PersistenceError ? error.message : "Solo rankings unavailable. Please retry." });
		}
	});
}
