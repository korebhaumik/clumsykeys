import type { Server } from "socket.io";
import { endRace, finishGame, joinRoom, leaveRoom, leaveRoomPermanently, resetRoom, startVote, stopVote, streamData, updateRaceSettings } from "./room.services";
import type { Persistence } from "./persistence";
import { createRaceWriter } from "./race.persistence";
import { createRateLimit } from "./security";

export function registerSocketHandlers(io: Server, persistence?: Persistence) {
const writeRace = createRaceWriter(io, persistence);
io.use(async (socket, next) => {
	const token = socket.handshake.auth?.accessToken;
	if (token === undefined || token === null || token === "") return next();
	if (!persistence || typeof token !== "string" || token.length > 8192) return next(new Error("Account session unavailable. Please sign in again."));
	try {
		const identity = await persistence.verify(token);
		socket.data.accountId = identity.id;
		socket.data.expiresAt = identity.expiresAt;
		next();
	} catch { next(new Error("Account session expired. Please sign in again.")); }
});
io.on("connection", (socket) => {
	// Leave headroom for samples buffered during the 30-second recovery window.
	const events = createRateLimit(60, 1000, 1);
	socket.use((_event, next) => {
		if (events("events")) { socket.disconnect(true); return; }
		next();
	});
	let expiry: ReturnType<typeof setTimeout> | undefined;
	if (socket.data.expiresAt) {
		expiry = setTimeout(() => socket.disconnect(true), Math.min(2_147_483_647, Math.max(0, socket.data.expiresAt - Date.now())));
		expiry.unref();
	}
	socket.on("joinRoom", (payload) => {
		const { username, roomId, userId, resumeToken } = payload ?? {};
		if (![username, roomId, userId].every((value) => typeof value === "string" && value.trim()) ||
			username.length > 50 || roomId.length > 100 || userId.length > 100 ||
			[username, roomId, userId].some(value => Array.from(value as string).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) ||
			(resumeToken !== undefined && (typeof resumeToken !== "string" || resumeToken.length > 100))) {
			socket.emit("error", { msg: "A username, room ID, and user ID are required" });
			return;
		}
		void joinRoom({ username, roomId, userId, resumeToken, socket, io, writeRace }).catch(() => socket.emit("error", { msg: "Unable to join room." }));
	});

	socket.on("startVote", (payload) => {
		const { roomId, userId } = payload ?? {};
		startVote({ roomId, userId, socket, io });
	});

	socket.on("stopVote", (payload) => {
		const { roomId, userId } = payload ?? {};
		stopVote({ roomId, userId, socket, io });
	});

	socket.on("updateRaceSettings", (patch) => updateRaceSettings(patch, socket, io));

	socket.on("finishGame", (payload) => {
		const { roomId, userId } = payload ?? {};
		finishGame({ roomId, userId, socket, io });
	});

	socket.on("resetGame", (payload) => {
		const { roomId } = payload ?? {};
		resetRoom({ roomId, socket, io });
	});

	socket.on("endRace", (payload) => endRace(payload?.roundId, socket, io));
	socket.on("leaveRoom", (acknowledge) => {
		leaveRoomPermanently(socket, io);
		if (typeof acknowledge === "function") acknowledge();
	});

	socket.on("timeData", (payload) => {
		const { roomId, userId, typedChars, wpm, accuracy } = payload ?? {};
		if (![typedChars, wpm, accuracy].every((value) => Number.isFinite(value) && value >= 0) || accuracy > 100 ||
			!Number.isSafeInteger(typedChars) || typedChars > 1_000_000 || wpm > 1500) return;
		streamData({ roomId, userId, typedChars, wpm, accuracy, socket, io });
	});

	socket.on("disconnect", () => { clearTimeout(expiry); leaveRoom(socket, io); });
});

}
