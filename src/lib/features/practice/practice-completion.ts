import type { PracticeSubmission } from "../../../../backend/src/persistence.contract";
import { practiceCategory, practiceCategoryKey } from "../../../../backend/src/practice-category.contract";
import { accountApi } from "../../services/account-api";
import { personalBestsKey, parsePersonalBests, recordPersonalBest, type PersonalBests } from "./personal-best";
import { submitPracticeResult } from "./result-persistence";

const guestBests: PersonalBests = {};
// Include completed tests awaiting persistence, isolated by the original account.
const accountBests = new Map<string, PersonalBests>();

/** Snapshot this category when typing starts, before the new result can be saved. */
export function startPracticeCompletion(accountId: string | null, test: Pick<PracticeSubmission, "mode" | "language" | "settings">) {
	const category = practiceCategory(test);
	const baseline = accountId && category
		? accountApi<{ wpm: number | null }>(`/api/practice-personal-best?${new URLSearchParams({ mode: category.mode, language: category.language, test: category.test, length: String(category.length) })}`, { accountId }).then(({ wpm }) => {
			const known = accountBests.get(accountId) ?? {};
			if (wpm !== null) recordPersonalBest(known, category, wpm);
			accountBests.set(accountId, known);
			return known;
		}).catch(() => undefined)
		: Promise.resolve(accountId ? undefined : readGuestBests());
	let completed = false;
	return async (result: PracticeSubmission) => {
		if (completed) return;
		completed = true;
		// Persist the retry entry immediately, even if the snapshot is still loading.
		submitPracticeResult(accountId, result, baseline);
		const bests = await baseline;
		if (!accountId) readGuestBests();
		const finishedCategory = practiceCategory(result);
		if (!category || !finishedCategory || practiceCategoryKey(category) !== practiceCategoryKey(finishedCategory)) return;
		const achievement = bests ? recordPersonalBest(bests, category, result.stats.wpm) : undefined;
		if (accountId && !bests) {
			const known = accountBests.get(accountId) ?? {};
			recordPersonalBest(known, category, result.stats.wpm);
			accountBests.set(accountId, known);
		}
		if (!accountId) {
			try { localStorage.setItem(personalBestsKey, JSON.stringify({ version: 2, bests: guestBests })); } catch { /* Keep in-memory bests when storage is blocked. */ }
		}
		return achievement;
	};
}

function readGuestBests() {
	try {
		const stored = parsePersonalBests(JSON.parse(localStorage.getItem(personalBestsKey) ?? "{}"));
		for (const [key, wpm] of Object.entries(stored)) guestBests[key] = Math.max(guestBests[key] ?? 0, wpm);
	} catch { /* Guest practice remains available without storage. */ }
	return guestBests;
}
