import { get } from "svelte/store";
import { account } from "../../state/account.store";
import { theme } from "../../state/app.store";
import { practiceBusy, preferenceSync } from "../../state/preferences.store";
import { codePreferences, codePreferencesKey } from "../practice/code-preferences";
import { testConfig } from "./settings.store";
import { accountApi, AccountApiError } from "../../services/account-api";
import { parsePreferences, type AccountData, type Preferences } from "../../../../backend/src/persistence.contract";

let reload = async () => {};
export function reloadAccountPreferences() { return reload(); }

export function startPreferenceSync() {
	let active = true;
	let accountId: string | null = null;
	let generation = 0;
	let ready = false;
	let applying = false;
	let revision = 0;
	let lastSaved = "";
	let saving = false;
	let conflict = false;
	let pendingRemote: Preferences | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let guest = snapshot();
	try { guest = parsePreferences(JSON.parse(sessionStorage.getItem("clumsy-keys:guest-preferences") ?? "null")) ?? guest; } catch { /* Browser storage may be unavailable. */ }
	function snapshot(): Preferences { return { version: 1, theme: get(theme), prose: get(testConfig), code: get(codePreferences) }; }
	function apply(value: Preferences) {
		applying = true;
		theme.set(value.theme); testConfig.set(value.prose); codePreferences.set(value.code);
		try { localStorage.setItem("theme", value.theme); sessionStorage.setItem(codePreferencesKey, JSON.stringify(value.code)); } catch { /* Keep current controls usable. */ }
		applying = false;
	}
	function hydrate() {
		if (!pendingRemote || get(practiceBusy)) return;
		const value = pendingRemote; pendingRemote = null;
		apply(value); lastSaved = JSON.stringify(snapshot()); ready = true;
		preferenceSync.set({ state: "saved", message: "Preferences synced." });
	}
	async function load() {
		if (!accountId) return;
		const id = accountId, version = ++generation;
		ready = false; conflict = false; clearTimeout(timer);
		preferenceSync.set({ state: "loading", message: "Loading account preferences…" });
		try {
			const result = await accountApi<AccountData>("/api/account", { accountId: id });
			if (version !== generation) return;
			revision = result.revision;
			if (result.preferences) { pendingRemote = result.preferences; hydrate(); }
			else { ready = true; lastSaved = ""; changed(); }
		} catch (error) {
			if (version === generation) preferenceSync.set({ state: "error", message: error instanceof Error ? error.message : "Could not load preferences." });
		}
	}
	async function save() {
		if (!accountId || !ready || saving || conflict) return;
		const id = accountId, version = generation;
		const preferences = snapshot(), serialized = JSON.stringify(preferences);
		if (serialized === lastSaved) return;
		saving = true;
		try {
			const result = await accountApi<{ revision: number }>("/api/account/preferences", {
				method: "PUT", accountId: id, body: { preferences, revision },
			});
			if (version !== generation) return;
			revision = result.revision; lastSaved = serialized;
			preferenceSync.set({ state: "saved", message: "Preferences synced." });
		} catch (error) {
			if (version !== generation) return;
			conflict = error instanceof AccountApiError && error.status === 409;
			preferenceSync.set({ state: conflict ? "conflict" : "error", message: error instanceof Error ? error.message : "Could not save preferences." });
		} finally {
			saving = false;
			if ((version !== generation || get(preferenceSync).state === "saved") && JSON.stringify(snapshot()) !== lastSaved) changed();
		}
	}
	function changed() {
		if (!active || applying) return;
		if (!accountId) { guest = snapshot(); return; }
		if (!ready || conflict || JSON.stringify(snapshot()) === lastSaved) return;
		preferenceSync.set({ state: "pending", message: "Saving preferences…" });
		clearTimeout(timer); timer = setTimeout(() => { void save(); }, 600);
	}
	const unsubscribers = [theme.subscribe(changed), testConfig.subscribe(changed), codePreferences.subscribe(changed), practiceBusy.subscribe(hydrate)];
	unsubscribers.push(account.subscribe(({ session }) => {
		const next = session?.user.id ?? null;
		if (next === accountId) return;
		const previous = accountId;
		generation++; ready = false; pendingRemote = null; clearTimeout(timer);
		accountId = next;
		if (!previous && next) {
			guest = snapshot();
			try { sessionStorage.setItem("clumsy-keys:guest-preferences", JSON.stringify(guest)); } catch { /* Optional guest backup. */ }
		}
		if (previous) apply(guest);
		if (next) void load();
		else preferenceSync.set({ state: "guest", message: "" });
	}));
	reload = async () => {
		if (get(preferenceSync).state === "error" && ready) await save();
		else await load();
	};
	return () => { active = false; generation++; clearTimeout(timer); unsubscribers.forEach(unsubscribe => unsubscribe()); reload = async () => {}; };
}
