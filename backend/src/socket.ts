import type { Server } from "socket.io";
import { finishGame, joinRoom, leaveRoom, resetRoom, startVote, stopVote, streamData, updateRaceSettings } from "./room.services";

export function registerSocketHandlers(io: Server) {
io.on("connection", (socket) => {
	socket.on("joinRoom", (payload) => {
		const { username, roomId, userId, resumeToken } = payload ?? {};
		if (![username, roomId, userId].every((value) => typeof value === "string" && value.trim())) {
			socket.emit("error", { msg: "A username, room ID, and user ID are required" });
			return;
		}
		void joinRoom({ username, roomId, userId, resumeToken, socket, io }).catch(console.error);
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

	socket.on("timeData", (payload) => {
		const { roomId, userId, typedChars, wpm, accuracy } = payload ?? {};
		if (![typedChars, wpm, accuracy].every((value) => Number.isFinite(value) && value >= 0) || accuracy > 100) return;
		streamData({ roomId, userId, typedChars, wpm, accuracy, socket, io });
	});

	socket.on("disconnect", () => leaveRoom(socket, io));
});

}
