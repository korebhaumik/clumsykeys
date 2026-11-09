import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from "cors";


import { registerRoomRoutes } from "./http";
import { registerSocketHandlers } from "./socket";

export function createApplication() {
const origins = [
	"http://localhost:5173", "http://localhost:4173",
	"http://127.0.0.1:5173", "http://127.0.0.1:4173",
	...(process.env.FRONTEND_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
];
const app = express();
app.use(cors({ origin: origins }));
const httpServer = createServer(app);

// Create a Socket.IO instance, passing it our server
const io = new Server(httpServer, {
	cors: {
		origin: origins,
		methods: ["GET", "POST"],
	},
});


registerRoomRoutes(app);
registerSocketHandlers(io);
return { app, io, httpServer };
}
