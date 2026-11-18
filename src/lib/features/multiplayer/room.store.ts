import { writable } from "svelte/store";
import { defaultRaceSettings } from "../../../../backend/src/race.settings";
import type { RoomSnapshot } from "../../../../backend/src/store";

export const emptyRoom: RoomSnapshot = { hostUserId: "", text: "", roundId: null, users: [], progress: "waiting", settings: defaultRaceSettings };
export const roomInfo = writable<RoomSnapshot>(emptyRoom);

export const resetRoom = () => {
	roomInfo.update((prev) => {
		return {
			...prev,
			roundId: null,
			results: undefined,
			users: prev.users.map((user) => {
				return {
					...user,
					typedChars: 0,
					enteredChars: 0,
					uncorrectedExtras: 0,
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
