import { get, writable } from "svelte/store";
import { account } from "../../state/account.store";
import { accountApi, AccountApiError } from "../../services/account-api";
import type { PracticeSubmission } from "../../../../backend/src/persistence.contract";
import { parsePractice } from "../../../../backend/src/persistence.contract";

const queueKey = "clumsy-keys:pending-results";
type Pending = { accountId: string; result: PracticeSubmission };
export const resultSaveStates = writable<Record<string, "pending" | "saved" | "failed">>({});
let pending: Pending[] = [];
try {
	const saved: unknown = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
	if (Array.isArray(saved)) pending = saved.slice(0, 20).flatMap(entry => {
		const result = parsePractice(entry?.result);
		return result && typeof entry.accountId === "string" ? [{ accountId: entry.accountId, result }] : [];
	});
} catch { /* Saving remains available without browser storage. */ }
let running = false;
let syncing = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
const beforeSaves = new Map<string, Promise<unknown>>();

function store() {
	try { localStorage.setItem(queueKey, JSON.stringify(pending)); } catch { /* The visible failed/pending state remains accurate. */ }
}
function state(id: string, value: "pending" | "saved" | "failed") {
	resultSaveStates.update(states => ({ ...states, [id]: value }));
}
export function submitPracticeResult(accountId: string | null, result: PracticeSubmission, beforeSave?: Promise<unknown>) {
	if (!accountId) return;
	if (!pending.some(entry => entry.result.id === result.id)) {
		if (pending.length >= 20 || JSON.stringify(pending).length + JSON.stringify(result).length > 2_000_000) {
			state(result.id, "failed"); return;
		}
		pending.push({ accountId, result: JSON.parse(JSON.stringify(result)) }); store();
		if (beforeSave) beforeSaves.set(result.id, beforeSave);
	}
	state(result.id, "pending"); void retryPracticeResults();
}
export async function retryPracticeResults() {
	if (running) return;
	clearTimeout(retryTimer); running = true;
	const id = get(account).session?.user.id;
	try {
		if (!id) return;
		while (true) {
			const entry = pending.find(item => item.accountId === id);
			if (!entry) break;
			state(entry.result.id, "pending");
			try {
				// Queue storage is immediate; only the network write waits for a PB snapshot.
				await beforeSaves.get(entry.result.id);
				beforeSaves.delete(entry.result.id);
				await accountApi("/api/practice-results", { method: "POST", body: entry.result, accountId: id });
				pending = pending.filter(item => item.result.id !== entry.result.id); store(); state(entry.result.id, "saved");
			} catch (error) {
				state(entry.result.id, "failed");
				if (syncing && (!(error instanceof AccountApiError) || error.status >= 500)) {
					retryTimer = setTimeout(() => { void retryPracticeResults(); }, 30_000);
				}
				break;
			}
		}
	} finally {
		running = false;
		const next = get(account).session?.user.id;
		if (syncing && next && next !== id) void retryPracticeResults();
	}
}
export function startResultSync() {
	syncing = true;
	const unsubscribe = account.subscribe(({ session }) => { if (session) void retryPracticeResults(); });
	const online = () => { void retryPracticeResults(); };
	window.addEventListener("online", online);
	return () => { syncing = false; unsubscribe(); clearTimeout(retryTimer); window.removeEventListener("online", online); };
}
