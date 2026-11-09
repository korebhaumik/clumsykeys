export type SpeedPoint = { seconds: number; wpm: number };

export type SpeedSeries = {
	label: string;
	color: string;
	points: SpeedPoint[];
	dashed?: boolean;
	finishSeconds?: number;
};

export type ErrorPoint = { seconds: number; count: number };

type ChartPoint = { x: number; y: number };

export function smoothPath(points: ChartPoint[]) {
	const first = points[0];
	if (!first) return "";

	const slopes = points.slice(1).map((point, index) => {
		const previous = points[index];
		const width = point.x - previous.x;
		return width > 0 ? (point.y - previous.y) / width : 0;
	});
	const tangents = points.map((_, index) => {
		const before = slopes[index - 1];
		const after = slopes[index];
		if (before === undefined) return after ?? 0;
		if (after === undefined) return before;
		// Flatten at peaks and valleys so the curve does not overshoot the samples.
		return before * after > 0 ? 2 / (1 / before + 1 / after) : 0;
	});

	return [`M ${first.x} ${first.y}`, ...points.slice(1).map((point, index) => {
		const previous = points[index];
		const offset = (point.x - previous.x) / 3;
		return `C ${previous.x + offset} ${previous.y + offset * tangents[index]} ${point.x - offset} ${point.y - offset * tangents[index + 1]} ${point.x} ${point.y}`;
	})].join(" ");
}
