import { io } from "socket.io-client";

const localServer = ["localhost", "127.0.0.1"].includes(window.location.hostname)
	? `${window.location.protocol}//${window.location.hostname}:1440`
	: undefined;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || localServer;
const socket = io(SERVER_URL, { autoConnect: false });

export default socket;
