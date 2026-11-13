import type { Server } from "socket.io";
import type { Persistence } from "./persistence";
import type { RaceArchive } from "./persistence.contract";

export function createRaceWriter(io: Server, persistence?: Persistence) {
	const pending = new Map<string, { round: RaceArchive; attempts: number; timer?: ReturnType<typeof setTimeout> }>();
	let closed = false;
	function status(round: RaceArchive, state: string) {
		io.to(round.roomId).emit("persistenceStatus", { roundId: round.id, state });
	}
	async function attempt(id: string) {
		const item = pending.get(id);
		if (!item || !persistence || closed) return;
		try {
			await persistence.saveRace(item.round);
			pending.delete(id); status(item.round, "saved");
		} catch {
			item.attempts += 1;
			if (item.attempts >= 5 || closed) {
				pending.delete(id); status(item.round, "failed");
				console.error("Race result persistence failed", { roundId: id, attempts: item.attempts });
				return;
			}
			item.timer = setTimeout(() => { void attempt(id); }, 500 * 2 ** item.attempts);
			item.timer.unref();
		}
	}
	io.httpServer?.once("close", () => {
		closed = true;
		for (const item of pending.values()) clearTimeout(item.timer);
		pending.clear();
	});
	return (round: RaceArchive) => {
		if (!persistence || closed) return;
		if (pending.size >= 100) {
			status(round, "failed"); console.error("Race persistence queue is full", { roundId: round.id }); return;
		}
		pending.set(round.id, { round, attempts: 0 });
		status(round, "pending");
		void attempt(round.id);
	};
}
