import type { Express, Request, Response } from "express";
import { isRecord, isUuid, parseHandle, parsePractice, parsePreferences } from "./persistence.contract";
import { PersistenceError, type Persistence } from "./persistence";
import { createRateLimit } from "./security";

export function registerAccountRoutes(app: Express, persistence?: Persistence) {
	const writes = createRateLimit(30, 60_000);
	app.get("/api/status", (_req, res) => res.json({ accounts: !!persistence }));
	function route(handler: (req: Request, res: Response, userId: string, db: Persistence) => Promise<unknown>) {
		return async (req: Request, res: Response) => {
			res.set("Cache-Control", "no-store");
			try {
				if (!persistence) throw new PersistenceError(503, "Accounts are not configured on this server.");
				const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
				if (!token || token.length > 8192) throw new PersistenceError(401, "Sign in to access your account.");
				const identity = await persistence.verify(token);
				if (req.method !== "GET") {
					const retry = writes(identity.id);
					if (retry) { res.set("Retry-After", String(retry)).status(429).json({ error: "Too many account updates. Please retry shortly." }); return; }
				}
				await handler(req, res, identity.id, persistence);
			} catch (error) {
				res.status(error instanceof PersistenceError ? error.status : 503)
					.json({ error: error instanceof PersistenceError ? error.message : "Account service unavailable. Please retry." });
			}
		};
	}
	app.get("/api/account", route(async (_req, res, id, db) => res.json(await db.account(id))));
	app.put("/api/account/handle", route(async (req, res, id, db) => {
		const handle = parseHandle(req.body?.handle);
		if (!handle) throw new PersistenceError(400, "Use 3–24 letters, numbers or underscores for your handle.");
		res.json({ handle: await db.saveHandle(id, handle) });
	}));
	app.get("/api/account/dashboard", route(async (_req, res, id, db) => res.json(await db.dashboard(id))));
	app.put("/api/account/preferences", route(async (req, res, id, db) => {
		const preferences = parsePreferences(req.body?.preferences);
		const revision = req.body?.revision;
		if (!preferences || !Number.isSafeInteger(revision) || revision < 0) throw new PersistenceError(400, "Invalid preferences or revision.");
		res.json({ revision: await db.savePreferences(id, preferences, revision) });
	}));
	app.post("/api/practice-results", route(async (req, res, id, db) => {
		const result = parsePractice(req.body);
		if (!result) throw new PersistenceError(400, "Invalid practice result.");
		await db.savePractice(id, result); res.status(201).json({ id: result.id });
	}));
	function offset(req: Request) {
		if (req.query.offset === undefined) return 0;
		if (typeof req.query.offset !== "string" || !/^\d{1,6}$/.test(req.query.offset)) throw new PersistenceError(400, "Invalid history offset.");
		return Number(req.query.offset);
	}
	app.get("/api/history", route(async (req, res, id, db) => {
		const start = offset(req);
		if (req.query.kind !== "practice" && req.query.kind !== "race") throw new PersistenceError(400, "Choose practice or race history.");
		const results = req.query.kind === "practice" ? await db.practiceHistory(id, start) : await db.raceHistory(id, start);
		res.json({ results, nextOffset: results.length === 20 ? start + 20 : null });
	}));
	app.get("/api/practice-results/:id", route(async (req, res, id, db) => {
		if (!isUuid(req.params.id)) throw new PersistenceError(400, "Invalid result ID.");
		const result = await db.practiceDetail(id, req.params.id);
		if (!result) throw new PersistenceError(404, "Result not found.");
		res.json(result);
	}));
	app.get("/api/race-results/:id", route(async (req, res, id, db) => {
		const roundId = req.params.id;
		if (roundId !== "latest" && !isUuid(roundId)) throw new PersistenceError(400, "Invalid round ID.");
		const result = await db.raceDetail(id, roundId === "latest" ? undefined : roundId as string);
		if (!result || !isRecord(result)) throw new PersistenceError(404, "Round not found.");
		res.json(result);
	}));
}
