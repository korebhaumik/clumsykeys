import type { RaceSettings } from "./race.settings";

export type Room = {
	hostUserId: string;
	text: string;
	roundId: string | null;
	startsAt?: number;
	settings: RaceSettings;
	users: {
		username: string;
		userId: string;
		vote: boolean;
		wpm: number;
		typedChars: number;
		accuracy: number;
		finished: boolean;
		isPlaying: boolean;
	}[];
	progress: "waiting" | "playing" | "finished";
};

export const rooms = new Map<string, Room>();
