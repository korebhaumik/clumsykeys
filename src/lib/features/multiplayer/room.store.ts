import { writable } from "svelte/store";
import { defaultRaceSettings, type RaceSettings } from "../../../../backend/src/race.settings";
import type { SpeedPoint } from "../../components/charts/result-chart";

type User = {
	userId: string;
	username: string;
	typedChars: number;
	wpm: number;
	speedHistory?: SpeedPoint[];
	finishSeconds?: number;
	accuracy: number;
	vote: boolean;
	finished: boolean;
    isPlaying: boolean;
};
export type Room = {
	text: string;
	roundId: string | null;
	startsAt?: number;
	settings: RaceSettings;
	users: User[];
	progress: "waiting" | "playing" | "finished";
};

export const emptyRoom: Room = { text: "", roundId: null, users: [], progress: "waiting", settings: defaultRaceSettings };
export const roomInfo = writable<Room>(emptyRoom);

export const resetRoom = () => {
	roomInfo.update((prev) => {
		return {
			...prev,
			roundId: null,
			users: prev.users.map((user) => {
				return {
					...user,
					typedChars: 0,
					wpm: 0,
					speedHistory: undefined,
					finishSeconds: undefined,
					accuracy: 100,
					vote: false,
					finished: false,
				};
			}),
			progress: "waiting",
		};
	});
};
