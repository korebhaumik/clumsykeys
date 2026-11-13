/** Shared solo practice choices; settings and leaderboards use the same catalog. */
export const proseLanguages = [
	{ value: "english", label: "English", size: "200 words" },
	{ value: "english 1k", label: "English 1K", size: "1K words" },
	{ value: "english 2k", label: "English (Mid)", size: "2K words" },
	{ value: "english 5k", label: "English (Hard)", size: "5K words" },
	{ value: "hinglish", label: "Hinglish", size: "207 words" },
] as const;

export const practiceDurations = [15, 30, 60, 120] as const;
export const practiceWordCounts = [25, 50, 100, 200] as const;
