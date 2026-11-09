import { writable } from "svelte/store";
import type { PracticeStats } from "../features/practice/session";

export type themeType = "dark-forest" | "classic";

export const themeBackgrounds: Record<themeType, string> = {
	classic: "bg-gray-100",
	"dark-forest": "bg-dark-forest-primary",
};

const savedTheme = localStorage.getItem("theme");
const initialTheme = savedTheme === "classic" ? "classic" : "dark-forest";
if (savedTheme !== initialTheme) localStorage.setItem("theme", initialTheme);

export const theme = writable<themeType>(initialTheme);
export const game = writable<"waiting" | "playing" | "finished">("waiting");
export const practiceStats = writable<PracticeStats>();
