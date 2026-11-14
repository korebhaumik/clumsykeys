import { writable } from "svelte/store";
import type { PracticeStats } from "../features/practice/session";

export type themeType = "dark-forest" | "classic";

export const themeBackgrounds: Record<themeType, string> = {
	classic: "bg-gray-100",
	"dark-forest": "bg-dark-forest-primary",
};

let savedTheme: string | null = null;
try { savedTheme = localStorage.getItem("theme"); } catch { /* Use the default theme without storage. */ }
const initialTheme = savedTheme === "classic" ? "classic" : "dark-forest";
try { if (savedTheme !== initialTheme) localStorage.setItem("theme", initialTheme); } catch { /* Storage is optional. */ }

export const theme = writable<themeType>(initialTheme);
export const game = writable<"waiting" | "playing" | "finished">("waiting");
export const practiceStats = writable<PracticeStats>();
