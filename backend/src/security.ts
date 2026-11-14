import type { RequestHandler } from "express";

// Fixed windows and a bounded registry avoid turning the limiter into a memory sink.
export function createRateLimit(limit: number, windowMs: number, maximumKeys = 10_000) {
	const entries = new Map<string, { count: number; until: number }>();
	let sweepAt = 0;
	return (key: string, now = Date.now()) => {
		if (now >= sweepAt) {
			for (const [id, entry] of entries) if (entry.until <= now) entries.delete(id);
			sweepAt = now + windowMs;
		}
		let entry = entries.get(key);
		if (entry && entry.until <= now) { entries.delete(key); entry = undefined; }
		if (!entry) {
			if (entries.size >= maximumKeys) return Math.max(1, Math.ceil((sweepAt - now) / 1000));
			entry = { count: 0, until: now + windowMs }; entries.set(key, entry);
		}
		if (entry.count >= limit) return Math.max(1, Math.ceil((entry.until - now) / 1000));
		entry.count += 1;
		return 0;
	};
}

export const securityHeaders: RequestHandler = (_req, res, next) => {
	res.set({
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "no-referrer",
		// Express serves JSON APIs only. The frontend host needs its own document CSP.
		"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	});
	next();
};

export function httpRateLimit(): RequestHandler {
	const consume = createRateLimit(240, 60_000);
	return (req, res, next) => {
		// Do not trust arbitrary X-Forwarded-For headers. See DEPLOYMENT.md for proxy limits.
		const retry = consume(req.socket.remoteAddress ?? "unknown");
		if (retry) { res.set("Retry-After", String(retry)).status(429).json({ error: "Too many requests. Please retry shortly." }); return; }
		next();
	};
}
