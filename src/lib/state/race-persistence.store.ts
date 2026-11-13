import { writable } from "svelte/store";

export const racePersistence = writable<{ roundId: string; state: "pending" | "saved" | "failed" } | null>(null);
export const raceRoundId = writable<string | null>(null);
