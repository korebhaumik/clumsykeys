const localServer = ["localhost", "127.0.0.1"].includes(window.location.hostname)
	? `${window.location.protocol}//${window.location.hostname}:1440` : "";
export const serverUrl = (import.meta.env.VITE_SERVER_URL || localServer).replace(/\/$/, "");
