import { writable } from "svelte/store";

// Lock hydration through the results screen; apply changes between sessions.
export const practiceBusy = writable(false);
export const preferenceSync = writable<{ state: "guest" | "loading" | "saved" | "pending" | "error" | "conflict"; message: string }>({ state: "guest", message: "" });
