// Types

export type QuotesParams = "Random Quotes";
export type LangParams = "english" | "english 1k" | "english 5k" | "english 2k" | "hinglish";


type Level = null | "easy" | "mid" | "hard" | "insane";

export type TestConfig = {
	punctuations: Level;
	numbers: Level;
	language: LangParams;
	timer: number | null;
	words: number | null;
	quotes: QuotesParams | null;
	difficulty: { wpmLimit: number | null; timeLimit: number | null };
};


//Modal Types
export type ModalContentParams =
	| "main"
	| "language"
	| "numbers"
	| "punctuations"
	| "testType"
	| "difficulty";

export type ModalConfig = {
	isVisible: boolean;
	content: ModalContentParams;
};

import { writable } from "svelte/store";

// ------------------Test Config----------------------

export const testConfig = writable({
	punctuations: null,
	numbers: null,
	language: "english 2k",
	timer: 30,
	words: null,
	quotes: null,
	difficulty: { wpmLimit: null, timeLimit: null },
} as TestConfig);

type TestType = "timer" | "words" | "quotes";

export function updateTestConfigType(type: TestType, value: number | QuotesParams) {
	testConfig.update((config) => {
		const temp = { timer: null, words: null, quotes: null };
		return { ...config, ...temp, [type]: value };
	});
}

export function updateTestConfigLanguage(value: LangParams) {
	testConfig.update((config) => {
		return { ...config, language: value };
	});
}

export function updateTestConfigNumbers(value: Level) {
	testConfig.update((config) => {
		return { ...config, numbers: value };
	});
}

export function updateTestConfigPunctuations(value: Level) {
	testConfig.update((config) => {
		return { ...config, punctuations: value };
	});
}

// Visual modal config

export const modalConfig = writable({
	isVisible: false,
	content: "main",
} as ModalConfig);

export function updateModalVisibility(bool?: boolean) {
	if (bool === false) {
		modalConfig.update((config) => {
			return { ...config, isVisible: false };
		});
		return;
	}
	modalConfig.update((config) => {
		return { ...config, isVisible: !config.isVisible };
	});
}

export function updateModalContent(content: ModalContentParams) {
	modalConfig.update((config) => {
		return { ...config, content: content };
	});
}
