<script lang="ts">
	import { onMount } from "svelte";
	import ResetSvg from "../../components/icons/ResetIcon.svelte";
	import type { PracticeResults } from "./session";
	import ResultsChart from "../../components/charts/ResultsChart.svelte";

	let { stats, testType, onRestart }: { stats: PracticeResults; testType: string; onRestart: () => void } = $props();
	const speedBands = [
		{ label: "0–30", upper: 30 },
		{ label: "30–60", upper: 60 },
		{ label: "60–90", upper: 90 },
		{ label: "90–120", upper: 120 },
		{ label: "120+", upper: Infinity },
	];
	let selectedWord = $state<PracticeResults["history"][number]>();

	function describeWord(word: PracticeResults["history"][number]) {
		const speed = word.wpm === null ? "No timed sample" : `${word.wpm} WPM`;
		return `${word.word} · ${speed} · ${word.errors} ${word.errors === 1 ? "error" : "errors"}`;
	}

	let heading = $state<HTMLHeadingElement>()!;

	let series = $derived([
		{ label: "Raw WPM", color: "var(--result-raw-wpm, var(--result-muted))", points: [{ seconds: 0, wpm: 0 }, ...stats.samples.map(({ seconds, raw }) => ({ seconds, wpm: raw }))] },
		{ label: "WPM", color: "var(--result-accent)", points: [{ seconds: 0, wpm: 0 }, ...stats.samples] },
	]);
	let errors = $derived(stats.samples.map(({ seconds, errors: count }) => ({ seconds, count })));

	onMount(() => heading.focus());
</script>

<section class="test-results practice-results" aria-labelledby="practice-results">
	<h2 class="sr-only" id="practice-results" bind:this={heading} tabindex="-1">Practice results</h2>
	<div class="result-overview">
		<dl class="result-headline">
			<div><dt>wpm</dt><dd>{stats.wpm}</dd></div>
			<div><dt>acc</dt><dd>{stats.accuracy}%</dd></div>
		</dl>
		<ResultsChart {series} {errors} />
	</div>

	<dl class="result-metrics">
		<div><dt>test type</dt><dd class="test-type">{testType}</dd></div>
		<div><dt>raw</dt><dd>{stats.raw}</dd></div>
		<div><dt>characters</dt><dd aria-label={`${stats.correct} correct, ${stats.incorrect} incorrect, ${stats.extra} extra`}>{stats.correct}/{stats.incorrect}/{stats.extra}</dd></div>
		<div><dt>wpm standard deviation</dt><dd>{stats.deviation.toFixed(2)}</dd></div>
		<div><dt>session</dt><dd>{stats.elapsedSeconds < 0.01 ? "<0.01" : Number(stats.elapsedSeconds.toFixed(2))} s</dd></div>
	</dl>

	<button class="result-replay" aria-label="Practice again" title="Practice again" onclick={onRestart}><ResetSvg /></button>

	<section class="word-history" aria-labelledby="input-history">
		<div class="history-header">
			<h3 id="input-history">input history</h3>
			<ul class="speed-legend" aria-label="Word speed bands in words per minute">
				{#each speedBands as band, index}
					<li data-band={index}>{band.label}</li>
				{/each}
			</ul>
			<span class="history-unit">WPM</span>
		</div>
		<div class="history">
			{#each stats.history as word}
				<button
					type="button" class="history-word"
					data-band={word.wpm === null ? undefined : speedBands.findIndex((band) => word.wpm! < band.upper)}
					data-wpm={word.wpm ?? undefined}
					title={describeWord(word)}
					aria-label={describeWord(word)}
					onclick={() => (selectedWord = word)}
				>{word.word || "␣"}</button>
			{/each}
		</div>
		<p class="history-detail" aria-live="polite">{selectedWord ? describeWord(selectedWord) : "Select a word to see its speed and errors."}</p>
	</section>
</section>

<style>
	.test-type { font-size: var(--text-1rem); margin-top: var(--dimension-0_4rem); }
	.word-history {
		--speed-0: var(--palette-speed-orange);
		--speed-1: var(--palette-speed-rose);
		--speed-2: var(--palette-speed-ivory);
		--speed-3: var(--palette-speed-sage);
		--speed-4: var(--palette-sage-300);
	}
	:global([data-theme="classic"]) .word-history {
		--speed-0: var(--palette-speed-orange-dark);
		--speed-1: var(--palette-speed-rose-dark);
		--speed-2: var(--palette-speed-neutral-dark);
		--speed-3: var(--palette-speed-sage-dark);
		--speed-4: var(--palette-green-800);
	}
	[data-band="0"] { --word-color: var(--speed-0); --swatch: var(--palette-speed-orange); }
	[data-band="1"] { --word-color: var(--speed-1); --swatch: var(--palette-speed-rose); }
	[data-band="2"] { --word-color: var(--speed-2); --swatch: var(--palette-speed-ivory); }
	[data-band="3"] { --word-color: var(--speed-3); --swatch: var(--palette-speed-sage); }
	[data-band="4"] { --word-color: var(--speed-4); --swatch: var(--palette-sage-300); }
	.history-header, .history { display: flex; flex-wrap: wrap; gap: var(--dimension-0_35rem) var(--dimension-0_7rem); align-items: center; }
	.history-header { margin-bottom: var(--dimension-0_5rem); }
	.speed-legend { display: inline-flex; flex-wrap: wrap; border-radius: var(--radius-0_25rem); overflow: hidden; }
	.speed-legend li { padding: var(--dimension-0_23rem) var(--dimension-0_42rem); background: var(--swatch); color: var(--palette-forest-950); font: 600 var(--text-0_75rem) var(--font-system); }
	:global([data-theme="classic"]) .speed-legend li { background: var(--word-color); color: var(--accent-ink); }
	.history-word { color: var(--word-color, var(--result-muted)); overflow-wrap: anywhere; min-width: 0; text-align: left; }
	.history-word:hover, .history-word:focus-visible { text-decoration: underline; }
	.history-unit, .history-detail { color: var(--result-muted); font-size: var(--text-0_75rem); }
	.history-detail { min-height: var(--dimension-1em); margin-top: var(--dimension-0_35rem); }
</style>
