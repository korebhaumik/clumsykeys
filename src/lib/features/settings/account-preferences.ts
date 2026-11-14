import { get } from "svelte/store";
import { account } from "../../state/account.store";
import { theme } from "../../state/app.store";
import { practiceBusy, preferenceSync, preferencesReady } from "../../state/preferences.store";
import { codePreferences, codePreferencesKey } from "../practice/code-preferences";
import { testConfig } from "./settings.store";
import { accountApi, AccountApiError } from "../../services/account-api";
import { parsePreferences, type AccountData, type Preferences } from "../../../../backend/src/persistence.contract";
import { cacheAccountPreferences, cacheGuestPreferences, readAccountPreferences, readGuestPreferences } from "./preferences-cache";

let reload = async () => {};
export function reloadAccountPreferences() { return reload(); }

export function startPreferenceSync() {
	let active = true, starting = true;
	let accountId: string | null = null;
	let generation = 0, changes = 0;
	let ready = false, applying = false, saving = false, conflict = false, dirty = false;
	let revision = 0, hasRevision = false;
	let lastSaved = "";
	let pendingRemote: Preferences | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let guest = snapshot();
	try {
		guest = readGuestPreferences(localStorage) ??
			parsePreferences(JSON.parse(sessionStorage.getItem("clumsy-keys:guest-preferences") ?? "null")) ?? guest;
	} catch { /* Browser storage may be unavailable. */ }
	function snapshot(): Preferences { return { version: 1, theme: get(theme), prose: get(testConfig), code: get(codePreferences) }; }
	function cache() {
		try {
			if (accountId && (ready || hasRevision || dirty)) cacheAccountPreferences(localStorage, { accountId, preferences: snapshot(),
				synced: lastSaved ? JSON.parse(lastSaved) : null, revision: hasRevision ? revision : null });
			else if (!accountId) cacheGuestPreferences(localStorage, guest);
		} catch { /* Keep settings usable when storage is unavailable. */ }
	}
	function apply(value: Preferences) {
		applying = true;
		if (get(theme) !== value.theme) theme.set(value.theme);
		if (JSON.stringify(get(testConfig)) !== JSON.stringify(value.prose)) testConfig.set(value.prose);
		if (JSON.stringify(get(codePreferences)) !== JSON.stringify(value.code)) codePreferences.set(value.code);
		try { localStorage.setItem("theme", value.theme); sessionStorage.setItem(codePreferencesKey, JSON.stringify(value.code)); } catch { /* Legacy keys remain supported. */ }
		applying = false;
	}
	function hydrate() {
		if (!pendingRemote || get(practiceBusy)) return;
		const value = pendingRemote; pendingRemote = null;
		apply(value); lastSaved = JSON.stringify(snapshot()); ready = true; dirty = false;
		cache(); preferencesReady.set(true);
		preferenceSync.set({ state: "saved", message: "Preferences synced." });
	}
	async function load(discardLocal = false) {
		if (!accountId) return;
		const id = accountId, version = ++generation, initialChanges = changes;
		ready = false; conflict = false; pendingRemote = null; clearTimeout(timer);
		preferenceSync.set({ state: "loading", message: "Loading account preferences…" });
		try {
			const result = await accountApi<AccountData>("/api/account", { accountId: id });
			if (version !== generation || !active) return;
			const remote = result.preferences === null ? null : parsePreferences(result.preferences);
			if (remote === undefined || !Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error("Could not read account preferences.");
			const keepLocal = (!discardLocal && dirty) || changes !== initialChanges;
			if (keepLocal && remote && (!hasRevision || revision !== result.revision)) {
				conflict = true; ready = true; preferencesReady.set(true);
				preferenceSync.set({ state: "conflict", message: "Preferences changed on another device. Reload preferences to use the saved version." });
				return;
			}
			revision = result.revision; hasRevision = true;
			if (keepLocal || !remote) {
				lastSaved = remote ? JSON.stringify(remote) : ""; ready = true;
				dirty = JSON.stringify(snapshot()) !== lastSaved;
				cache(); preferencesReady.set(true); changed();
				if (!dirty) preferenceSync.set({ state: "saved", message: "Preferences synced." });
			} else { pendingRemote = remote; hydrate(); }
		} catch (error) {
			if (version === generation && active) {
				preferencesReady.set(true);
				preferenceSync.set({ state: "error", message: error instanceof Error ? error.message : "Could not load preferences." });
			}
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
			if (version !== generation || !active) return;
			revision = result.revision; hasRevision = true; lastSaved = serialized;
			dirty = JSON.stringify(snapshot()) !== lastSaved; cache();
			preferenceSync.set({ state: "saved", message: "Preferences synced." });
		} catch (error) {
			if (version !== generation || !active) return;
			conflict = error instanceof AccountApiError && error.status === 409;
			preferenceSync.set({ state: conflict ? "conflict" : "error", message: error instanceof Error ? error.message : "Could not save preferences." });
		} finally {
			saving = false;
			if (active && (version !== generation || get(preferenceSync).state === "saved") && JSON.stringify(snapshot()) !== lastSaved) changed();
		}
	}
	function changed() {
		if (!active || applying || starting) return;
		changes++;
		if (!accountId) { guest = snapshot(); cache(); return; }
		dirty = JSON.stringify(snapshot()) !== lastSaved; cache();
		if (!ready || conflict || !dirty) return;
		preferenceSync.set({ state: "pending", message: "Saving preferences…" });
		clearTimeout(timer); timer = setTimeout(() => { void save(); }, 600);
	}
	// Restore before subscribing and before mounting the route's typing engine.
	apply(guest);
	const unsubscribeAccount = account.subscribe(({ session }) => {
		const next = session?.user.id ?? null;
		if (next === accountId) return;
		generation++; ready = false; pendingRemote = null; clearTimeout(timer);
		const previous = accountId;
		accountId = next; revision = 0; hasRevision = false; lastSaved = ""; dirty = false;
		if (!previous && next) {
			guest = snapshot();
			try { sessionStorage.setItem("clumsy-keys:guest-preferences", JSON.stringify(guest)); } catch { /* Optional legacy guest backup. */ }
		}
		apply(guest);
		if (next) {
			let cached;
			try { cached = readAccountPreferences(localStorage, next); } catch { /* Optional cache. */ }
			if (cached) {
				apply(cached.preferences); revision = cached.revision ?? 0; hasRevision = cached.revision !== null;
				lastSaved = cached.synced ? JSON.stringify(cached.synced) : "";
				dirty = JSON.stringify(snapshot()) !== lastSaved;
			}
			preferencesReady.set(!!cached);
			void load();
		} else { preferencesReady.set(true); preferenceSync.set({ state: "guest", message: "" }); }
	});
	const unsubscribers = [unsubscribeAccount, theme.subscribe(changed), testConfig.subscribe(changed), codePreferences.subscribe(changed), practiceBusy.subscribe(hydrate)];
	starting = false;
	cache();
	reload = async () => {
		if (get(preferenceSync).state === "error" && ready) await save();
		else await load(conflict);
	};
	const onOnline = () => { if (accountId && get(preferenceSync).state === "error") void reload(); };
	window.addEventListener("online", onOnline);
	return () => { window.removeEventListener("online", onOnline); active = false; generation++; clearTimeout(timer); unsubscribers.forEach(unsubscribe => unsubscribe()); reload = async () => {}; };
}
