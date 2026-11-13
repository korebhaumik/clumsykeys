import { registerLeaderboardRoutes } from "./leaderboard.http";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from "cors";


import { registerRoomRoutes } from "./http";
import { registerSocketHandlers } from "./socket";
import { registerAccountRoutes } from "./account.http";
import type { Persistence } from "./persistence";

export function createApplication(options: { persistence?: Persistence } = {}) {
const origins = [
	"http://localhost:5173", "http://localhost:4173",
	"http://127.0.0.1:5173", "http://127.0.0.1:4173",
	...(process.env.FRONTEND_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
];
const app = express();
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "1mb" }));
const httpServer = createServer(app);

// Create a Socket.IO instance, passing it our server
const io = new Server(httpServer, {
	cors: {
		origin: origins,
		methods: ["GET", "POST"],
	},
});


registerRoomRoutes(app);
registerAccountRoutes(app, options.persistence);
registerLeaderboardRoutes(app, options.persistence);
registerSocketHandlers(io, options.persistence);
app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	void _next;
	res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? "Request is too large." : "Invalid JSON request." });
});
return { app, io, httpServer };
}
