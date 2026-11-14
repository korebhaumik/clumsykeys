import { isRecord, parsePreferences, type Preferences } from '../../../../backend/src/persistence.contract';

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
export const guestPreferencesKey = 'clumsy-keys:guest-preferences:v1';
export const accountPreferencesKey = 'clumsy-keys:account-preferences:v1';
export type CachedPreferences = { accountId: string; preferences: Preferences; synced: Preferences | null; revision: number | null };

function validate(value: unknown): Preferences | undefined {
	try { return parsePreferences(value); } catch { return undefined; }
}
function read(storage: StorageAccess, key: string): unknown {
	try {
		const raw = storage.getItem(key);
		return raw && raw.length <= 16_384 ? JSON.parse(raw) : undefined;
	} catch { return undefined; }
}
function write(storage: StorageAccess, key: string, value: unknown) {
	try { storage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional; keep settings usable. */ }
}
export function readGuestPreferences(storage: StorageAccess): Preferences | undefined {
	return validate(read(storage, guestPreferencesKey));
}
export function cacheGuestPreferences(storage: StorageAccess, preferences: Preferences) {
	const value = validate(preferences);
	if (value) write(storage, guestPreferencesKey, value);
}
export function readAccountPreferences(storage: StorageAccess, accountId: string): CachedPreferences | undefined {
	const value = read(storage, accountPreferencesKey);
	if (!isRecord(value) || value.version !== 1 || value.accountId !== accountId) return;
	const preferences = validate(value.preferences);
	const synced = value.synced === null ? null : validate(value.synced);
	if (!preferences || synced === undefined || (value.revision !== null &&
		(typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0))) return;
	return { accountId, preferences, synced, revision: value.revision as number | null };
}
export function cacheAccountPreferences(storage: StorageAccess, value: CachedPreferences) {
	write(storage, accountPreferencesKey, { version: 1, ...value });
}
