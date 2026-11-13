import type { Express } from "express";
import { rooms } from "./store";

export function registerRoomRoutes(app: Express) {
app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.get("/rooms", (req, res) => {
	const { roomId } = req.query;
	if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 100) {
		return res.status(400).json({ error: "roomId must be a single non-empty string" });
	}

	const room = rooms.get(roomId);
	if (!room) return res.status(404).json({ error: "Room not found" });

	return res.json(room.users.map(({ username, userId, typedChars, wpm, accuracy }) => ({
		username,
		userId,
		typedChars,
		wpm,
		accuracy,
	})));
});

}
