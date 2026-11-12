import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { type Room, rooms } from "./store";
import { applyRaceSettings, defaultRaceSettings } from "./race.settings";
import { makeRacePassage } from "./race.passage";

type JoinRoomReq = {
	username: string;
	resumeToken?: string;
	roomId: string;
	userId: string;
	socket: Socket;
	io: Server;
};
type StartVoteReq = {
	roomId: string;
	userId: string;
	socket: Socket;
	io: Server;
};
type StopVoteReq = {
	roomId: string;
	userId: string;
	socket: Socket;
	io: Server;
};
type FinishGameReq = {
	roomId: string;
	userId: string;
	socket: Socket;
	io: Server;
};
type ResetRoomReq = {
	socket: Socket;
	roomId: string;
	io: Server;
};
type StreamData = {
	socket: Socket;
	roomId: string;
	userId: string;
	wpm: number;
	typedChars: number;
	accuracy: number;
	io: Server;
};

type Notif = {
	msg: string;
	roomId: string;
	io: Server;
	socket?: Socket;
};

type Racer = Room["users"][number];

const recoveryWindowMs = 30_000;
const sessions = new WeakMap<Racer, {
	token: string;
	socketId: string | null;
	expiry?: ReturnType<typeof setTimeout>;
}>();

const roundStarts = new WeakMap<Room, number>();
const roundTimers = new WeakMap<Room, ReturnType<typeof setTimeout>>();
const countdownTimers = new WeakMap<Room, ReturnType<typeof setTimeout>>();
const speedHistory = new WeakMap<Racer, { seconds: number; wpm: number }[]>();
const finishTimes = new WeakMap<Racer, number>();

function roomSnapshot(room: Room) {
	if (room.progress !== "finished") return room;
	return {
		...room,
		users: room.users.map((racer) => ({
			...racer,
			speedHistory: speedHistory.get(racer) ?? [],
			finishSeconds: finishTimes.get(racer),
		})),
	};
}

function findRacer(room: Room | undefined, userId: string) {
	return room?.users.find((racer) => racer.userId === userId);
}

function socketOwnsRacer(room: Room | undefined, userId: string, socket: Socket) {
	const racer = findRacer(room, userId);
	return racer && sessions.get(racer)?.socketId === socket.id ? racer : undefined;
}

export const joinRoom = async ({ username, roomId, userId, resumeToken, socket, io }: JoinRoomReq) => {
	if (socket.data.roomId && (socket.data.roomId !== roomId || socket.data.userId !== userId)) return;
	const room = rooms.get(roomId);
	const existing = findRacer(room, userId);
	const session = existing && sessions.get(existing);

	if (room && session && (session.socketId === socket.id || session.token === resumeToken)) {
		const previousSocket = session.socketId && io.sockets.sockets.get(session.socketId);
		clearTimeout(session.expiry);
		session.expiry = undefined;
		session.socketId = socket.id;
		socket.data.roomId = roomId;
		socket.data.userId = userId;
		if (previousSocket && previousSocket !== socket) previousSocket.disconnect();
		await socket.join(roomId);
		socket.emit("roomSession", { resumeToken: session.token });
		return socket.emit("roomData", roomSnapshot(room));
	}

	if (room?.progress === "playing" || room?.progress === "finished") {
		return socket.emit("error", { msg: "Game is already in progress" });
	}
	if (existing) return socket.emit("error", { msg: "Unable to resume this racer" });

	const racer = {
		username,
		userId,
		vote: false,
		wpm: 0,
		typedChars: 0,
		accuracy: 100,
		finished: false,
		isPlaying: false,
	};
	const joinedRoom: Room = room ?? {
		text: "",
		roundId: null,
		settings: { ...defaultRaceSettings },
		users: [],
		progress: "waiting",
	};
	const token = randomUUID();
	cancelCountdown(joinedRoom);
	sessions.set(racer, { token, socketId: socket.id });
	socket.data.roomId = roomId;
	socket.data.userId = userId;
	joinedRoom.users.push(racer);
	rooms.set(roomId, joinedRoom);
	await socket.join(roomId);

	socket.emit("roomSession", { resumeToken: token });
	sendNotif({ msg: `${username} joined room ${roomId}`, roomId, io });
	return io.to(roomId).emit("roomData", joinedRoom);
};

export const leaveRoom = (socket: Socket, io: Server) => {
	const { roomId, userId } = socket.data;
	const room = rooms.get(roomId);
	const racer = socketOwnsRacer(room, userId, socket);
	if (!room || !racer) return;

	const session = sessions.get(racer)!;
	session.socketId = null;
	if (room.progress !== "waiting") {
		session.expiry = setTimeout(() => {
			if (session.socketId === null) removeRacer(room, roomId, racer, io);
		}, recoveryWindowMs);
		return;
	}
	removeRacer(room, roomId, racer, io);
};

function removeRacer(room: Room, roomId: string, racer: Racer, io: Server) {
	const index = room.users.indexOf(racer);
	if (index === -1) return;
	clearTimeout(sessions.get(racer)?.expiry);
	sessions.delete(racer);
	room.users.splice(index, 1);

	sendNotif({ msg: `${racer.username} left room ${roomId}`, roomId, io });
	if (room.progress === "waiting") {
		resetVotes(roomId);
	} else if (room.users.length === 0) {
		resetData(roomId);
	} else if (room.progress === "playing") {
		finishRoomIfComplete(room, roomId, io);
	}
	io.to(roomId).emit("roomData", roomSnapshot(room));
}

function finishRoomIfComplete(room: Room, roomId: string, io: Server) {
	if (!room.users.every((racer) => racer.finished)) return;
	clearTimeout(roundTimers.get(room));
	roundTimers.delete(room);
	room.progress = "finished";
	sendNotif({ msg: `Game finished in room ${roomId}!!!!`, roomId, io });
}

export function updateRaceSettings(patch: unknown, socket: Socket, io: Server) {
	const { roomId, userId } = socket.data;
	const room = rooms.get(roomId);
	if (!room || room.progress !== "waiting" || room.startsAt || !socketOwnsRacer(room, userId, socket)) return;
	const settings = applyRaceSettings(room.settings, patch);
	if (!settings) return;
	room.settings = settings;
	resetVotes(roomId);
	io.to(roomId).emit("roomData", room);
}

export const startVote = async ({ roomId, userId, socket, io }: StartVoteReq) => {
	const room = rooms.get(roomId) as Room;
	if (!room) return;
	const user = socketOwnsRacer(room, userId, socket);
	if (!user || room.progress !== "waiting") return;
	user.vote = true;
	rooms.set(roomId, room);

	const totalUsers = room.users.length;
	const totalVotes = room.users.filter((user) => user.vote).length;

	if (totalUsers >= 2 && totalVotes === totalUsers && !room.startsAt) {
		room.startsAt = Date.now() + 5000;
		countdownTimers.set(room, setTimeout(() => {
			cancelCountdown(room);
			startGame(roomId, io);
			io.to(roomId).emit("roomData", room);
		}, 5000));
	}

	const msg = `${user.username} voted to start game in room ${roomId}`;
	console.log(msg);
	sendNotif({ msg, roomId, io });
	return io.to(roomId).emit("roomData", room);
};

export const stopVote = async ({ roomId, userId, socket, io }: StopVoteReq) => {
	const room = rooms.get(roomId) as Room;
	if (!room) return;
	const user = socketOwnsRacer(room, userId, socket);
	if (!user || room.progress !== "waiting") return;

	user.vote = false;
	cancelCountdown(room);
	rooms.set(roomId, room);

	const msg = `${user.username} stopped vote in room ${roomId}`;
	console.log(msg);
	sendNotif({ msg, roomId, io });
	return io.to(roomId).emit("roomData", room);
};

export const finishGame = async ({ roomId, userId, socket, io }: FinishGameReq) => {
	const room = rooms.get(roomId);
	const user = socketOwnsRacer(room, userId, socket);
	if (!room || room.progress !== "playing" || !user || user.finished) return;
	user.finished = true;
	const startedAt = roundStarts.get(room);
	if (startedAt !== undefined) finishTimes.set(user, (performance.now() - startedAt) / 1000);
	finishRoomIfComplete(room, roomId, io);

	const msg = `${user.username} finished the game in room ${roomId}`;
	console.log(msg);
	sendNotif({ msg, roomId, io });
	return io.to(roomId).emit("roomData", roomSnapshot(room));
};

export const resetRoom = async ({ roomId, socket, io }: ResetRoomReq) => {
	const room = rooms.get(roomId);
	if (!room || room.progress !== "finished" || !socketOwnsRacer(room, socket.data.userId, socket)) return;
	room.users = room.users.filter((racer) => {
		const session = sessions.get(racer);
		if (session?.socketId) return true;
		clearTimeout(session?.expiry);
		sessions.delete(racer);
		return false;
	});
	resetData(roomId);
	return io.to(roomId).emit("roomData", room);
};

export const streamData = async ({ roomId, userId, wpm, typedChars, accuracy, socket, io }: StreamData) => {
	const room = rooms.get(roomId);
	const user = socketOwnsRacer(room, userId, socket);
	if (!room || room.progress !== "playing" || !user || user.finished) return;
	user.wpm = wpm;
	user.typedChars = typedChars;
	user.accuracy = accuracy;
	const startedAt = roundStarts.get(room);
	if (startedAt !== undefined) {
		const seconds = Math.max(0.001, (performance.now() - startedAt) / 1000);
		const history = speedHistory.get(user) ?? [];
		const point = { seconds, wpm };
		const last = history.at(-1);
		if (last && Math.floor(last.seconds) === Math.floor(seconds)) history[history.length - 1] = point;
		else history.push(point);
		// Keep the payload bounded for unusually long rounds while retaining the whole time range.
		speedHistory.set(user, history.length > 600 ? history.filter((_, index) => index % 2 === 0) : history);
	}
	rooms.set(roomId, room);

	return io.to(roomId).emit("roomData", room);
};

function sendNotif({ msg, roomId, io }: Notif) {
	io.to(roomId).emit("notif", { msg });
}

function cancelCountdown(room: Room) {
	clearTimeout(countdownTimers.get(room));
	countdownTimers.delete(room);
	delete room.startsAt;
}

function resetVotes(roomId: string) {
	const room = rooms.get(roomId) as Room;
	cancelCountdown(room);
	room.users.forEach((user) => (user.vote = false));
	rooms.set(roomId, room);
}

function startGame(roomId: string, io: Server) {
	const room = rooms.get(roomId) as Room;
	room.text = makeRacePassage(room.settings);
	room.progress = "playing";
	room.roundId = randomUUID();
	roundStarts.set(room, performance.now());
	room.users.forEach((user) => {
		user.isPlaying = true;
	});
	if (room.settings.mode === "time") {
		const timer = setTimeout(() => {
			room.users.forEach((racer) => { racer.finished = true; });
			finishRoomIfComplete(room, roomId, io);
			io.to(roomId).emit("roomData", roomSnapshot(room));
		}, room.settings.duration * 1000);
		roundTimers.set(room, timer);
	}
	rooms.set(roomId, room);
}

function resetData(roomId: string) {
	const room = rooms.get(roomId) as Room;
	clearTimeout(roundTimers.get(room));
	roundTimers.delete(room);
	roundStarts.delete(room);
	room.users.forEach((user) => {
		user.vote = false;
		user.finished = false;
		user.wpm = 0;
		speedHistory.delete(user);
		finishTimes.delete(user);
		user.typedChars = 0;
		user.accuracy = 100;
		user.isPlaying = false;
	});
	room.progress = "waiting";
	room.roundId = null;
	rooms.set(roomId, room);
}
