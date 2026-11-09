<script lang="ts">
	import { smoothPath, type ErrorPoint, type SpeedSeries } from "./result-chart";

	let { series, errors }: { series: SpeedSeries[]; errors?: ErrorPoint[] } = $props();
	let width = $state(0);
	const height = 212;
	const left = 49;
	const top = 12;
	const bottom = 173;
	let chartWidth = $derived(Math.max(250, width || 800));
	let right = $derived(chartWidth - (errors ? 42 : 16));
	let elapsed = $derived(series.reduce((max, line) => Math.max(max, line.points.at(-1)?.seconds ?? 0, line.finishSeconds ?? 0), 1));
	let hasFinishes = $derived(series.some((line) => line.finishSeconds !== undefined));
	let peak = $derived(series.reduce((max, line) => line.points.reduce((highest, point) => Math.max(highest, point.wpm), max), 0));
	let step = $derived(Math.max(5, Math.ceil(peak / 20) * 5));
	let maxErrors = $derived(errors?.reduce((max, point) => Math.max(max, point.count), 2) ?? 2);
	let tickCount = $derived(chartWidth > 620 ? 6 : 3);

	const x = (seconds: number) => left + (right - left) * seconds / elapsed;
	const y = (value: number) => bottom - (bottom - top) * value / (step * 4);
	const errorY = (value: number) => bottom - (bottom - top) * value / maxErrors;
	const timeLabel = (seconds: number) => seconds < 60 ? Number(seconds.toFixed(1)) : Math.round(seconds);
</script>

<figure class="chart" aria-label={errors ? "Practice speed and errors over time" : "Race speed by player over time"}>
	<div bind:clientWidth={width} class="chart-plot">
		<svg viewBox="0 0 {chartWidth} {height}" role="img" aria-label="Words per minute by elapsed seconds">
			<rect x={left} y={top} width={right - left} height={bottom - top} fill="var(--result-plot)" />
			{#each [0, 1, 2, 3, 4] as tick}
				<line class="grid-line" x1={left} x2={right} y1={y(tick * step)} y2={y(tick * step)} />
				<text x={left - 7} y={y(tick * step)} text-anchor="end" dominant-baseline="middle">{tick * step}</text>
			{/each}
			{#each Array.from({ length: tickCount + 1 }, (_, index) => elapsed * index / tickCount) as seconds}
				<line class="grid-line" x1={x(seconds)} x2={x(seconds)} y1={top} y2={bottom} />
				<text x={x(seconds)} y={bottom + 15} text-anchor="middle">{timeLabel(seconds)}</text>
			{/each}
			<text x={(left + right) / 2} y={height - 4} text-anchor="middle">Elapsed seconds</text>
			<text transform="translate(13 {(top + bottom) / 2}) rotate(-90)" text-anchor="middle">Words per minute</text>
			{#if errors}
				<text x={right + 7} y={top + 3}>{maxErrors}</text>
				<text x={right + 7} y={bottom + 3}>0</text>
				<text transform="translate({chartWidth - 9} {(top + bottom) / 2}) rotate(90)" text-anchor="middle">Errors</text>
			{/if}
			{#each series as line}
				{#if line.finishSeconds !== undefined}
					<line data-finish={line.label} x1={x(line.finishSeconds)} x2={x(line.finishSeconds)} y1={top} y2={bottom}
						stroke={line.color} stroke-width="2" stroke-linecap="round" stroke-dasharray="1 5">
						<title>{line.label} finished at {line.finishSeconds.toFixed(2)} s</title>
					</line>
				{/if}
			{/each}
			{#each series as line}
				<path
					data-series={line.label}
					d={smoothPath(line.points.map(({ seconds, wpm }) => ({ x: x(seconds), y: y(wpm) })))}
					stroke={line.color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
					stroke-dasharray={line.dashed ? "5 4" : undefined} fill="none"
				/>
				{#if line.points.length <= 60}
					{#each line.points as point}
						<circle cx={x(point.seconds)} cy={y(point.wpm)} r="2.8" fill={line.color}>
							<title>{line.label} · {timeLabel(point.seconds)} s · {point.wpm} WPM</title>
						</circle>
					{/each}
				{/if}
			{/each}
			{#each errors ?? [] as { seconds, count }}
				{#if count}
					<rect data-error-point x="-3" y="-3" width="6" height="6" transform="translate({x(seconds)} {errorY(count)}) rotate(45)" fill="var(--result-error)">
						<title>{timeLabel(seconds)} s · {count} {count === 1 ? "error" : "errors"}</title>
					</rect>
				{/if}
			{/each}
		</svg>
	</div>
	<figcaption>
		{#each series as line}
			<span>
				<i class:dashed={line.dashed} style:color={line.color}></i>
				{line.label}{#if line.finishSeconds !== undefined} · {line.finishSeconds.toFixed(2)} s{/if}
			</span>
		{/each}
		{#if hasFinishes}<span><i class="finish"></i>Finish time</span>{/if}
		{#if errors}<span><i class="error"></i>Errors</span>{/if}
	</figcaption>
</figure>

<style>
	.chart { min-width: 0; margin: 0; }
	.chart-plot { min-width: 0; }
	svg { display: block; width: 100%; overflow: visible; }
	text { fill: var(--result-muted); font: var(--text-11px) var(--font-system); }
	.grid-line { stroke: var(--result-grid); }
	figcaption { display: flex; flex-wrap: wrap; gap: var(--dimension-0_4rem) var(--dimension-1rem); padding-left: var(--dimension-3rem); color: var(--result-muted); font-size: var(--text-0_8rem); }
	figcaption span { display: inline-flex; align-items: center; gap: var(--dimension-0_4rem); overflow-wrap: anywhere; min-width: 0; }
	figcaption i { border-top: var(--dimension-2px) solid currentColor; width: var(--dimension-1rem); flex: none; }
	figcaption .dashed { border-top-style: dashed; }
	figcaption .finish { width: 0; height: var(--dimension-0_85rem); border: 0; border-left: var(--dimension-2px) dotted currentColor; }
	figcaption .error { border: 0; width: var(--dimension-0_4rem); height: var(--dimension-0_4rem); margin-inline: var(--dimension-0_3rem); background: var(--result-error); transform: rotate(45deg); }
</style>
