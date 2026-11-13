// Browser-safe solo leaderboard contract.
export type LeaderboardMode = "prose" | "dev";
export type TestFormat = "time" | "words" | "quotes" | "snippets" | "keywords-time" | "keywords-words";
export type LeaderboardFilters = {
	mode: LeaderboardMode; language: string; test: TestFormat; length: number;
	range: "all" | "month" | "week" | "day"; page: number;
};
export type SoloScore = {
	id: string; userId: string; username: string; mode: LeaderboardMode; language: string;
	test: TestFormat; length: number; wpm: number; raw: number; accuracy: number; deviation: number;
	correct: number; incorrect: number; extra: number; date: string;
};
export type RankedScore = SoloScore & { rank: number };
export type LeaderboardPage = {
	rows: RankedScore[]; currentUser: RankedScore | null; total: number; page: number; pages: number;
};
