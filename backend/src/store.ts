import type { RaceSettings } from "./race.settings";
import type { RaceStanding } from "./race.scoring";

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
		enteredChars: number;
		uncorrectedExtras: number;
		accuracy: number;
		finished: boolean;
		isPlaying: boolean;
	}[];
	progress: "waiting" | "playing" | "finished";
};

export type RoomSnapshot = Omit<Room, "users"> & {
	users: (Room["users"][number] & { speedHistory?: RaceStanding["speedHistory"]; finishSeconds?: number })[];
	results?: RaceStanding[];
};

export const rooms = new Map<string, Room>();
