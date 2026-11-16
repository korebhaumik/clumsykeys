<script lang="ts">
	import { push, router } from "svelte-spa-router";
	import { onMount } from "svelte";
	import { finalRanking } from "./race.store";
	import socket from "./socket";
	import { resetRoom } from "./room.store";
	import ResultsChart from "../../components/charts/ResultsChart.svelte";
	import { account } from "../../state/account.store";
	import { accountApi } from "../../services/account-api";
	import { racePersistence, raceRoundId } from "../../state/race-persistence.store";
	import type { SpeedPoint } from "../../components/charts/result-chart";

	const userId = localStorage.getItem("userId");
	let archivedOwnId = $state<string>();
	let historyError = $state("");
	let leaderboard = $derived(router.location === "/leaderboard");
	const colors = ["var(--result-accent)", "var(--racer-blue)", "var(--racer-orange)", "var(--racer-violet)", "var(--racer-pink)", "var(--racer-teal)"];
	let ownScore = $derived($finalRanking.find((racer) => racer.userId === (archivedOwnId ?? userId)));
	let racers = $derived($finalRanking.map((racer, index) => ({
		...racer,
		color: colors[index % colors.length],
		dashed: index >= colors.length,
	})));
	let scores = $derived(leaderboard
		? racers.toSorted((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)
		: racers);
	let series = $derived(racers.filter((racer) => racer.speedHistory.length || racer.finishSeconds !== undefined).map((racer) => ({
		label: racer.username,
		color: racer.color,
		dashed: racer.dashed,
		finishSeconds: racer.finishSeconds,
		points: [{ seconds: 0, wpm: 0 }, ...racer.speedHistory],
	})));

	onMount(() => {
		let active = true;
		if (!$finalRanking.length && $account.session) {
			void accountApi<{ round: { id: string }; ownRacerId: string; results: { racer_id: string; username: string; wpm: number; accuracy: number; speed_history: SpeedPoint[]; finish_seconds: number | null }[] }>("/api/race-results/latest")
				.then(result => {
					if (!active) return;
					archivedOwnId = result.ownRacerId;
					raceRoundId.set(result.round.id); racePersistence.set({ roundId: result.round.id, state: "saved" });
					finalRanking.set(result.results.map(racer => ({ userId: racer.racer_id, username: racer.username, wpm: racer.wpm,
						accuracy: racer.accuracy, speedHistory: racer.speed_history, finishSeconds: racer.finish_seconds ?? undefined })));
				}).catch(error => { if (active && error.status !== 404) historyError = error.message; });
		}
		if (leaderboard) return () => { active = false; };
		const roomId = localStorage.getItem("roomId");
		resetRoom();
		socket.emit("resetGame", { roomId });
		return () => { active = false; };
	});

	function replay() {
		void push("/race");
	}
</script>

<section class="test-results race-results" aria-labelledby="ranking-title">
	<header class="results-heading">
		<div>
			<p class="eyebrow">Multiplayer · {leaderboard ? "Latest race" : racers.length ? "Round complete" : "Results"}</p>
			<h1 id="ranking-title">{leaderboard ? "Leaderboard" : "Race results"}</h1>
			{#if racers.length}
				<p class="summary">{racers.length} {racers.length === 1 ? "racer" : "racers"}</p>
			{/if}
		</div>
		{#if leaderboard}
			<a tabindex="0" class="replay" href="#/race">Multiplayer <span aria-hidden="true">↗</span></a>
		{:else}
			<button tabindex="0" class="replay" onclick={replay}>
				{racers.length ? "Race again" : "Back to room"} <span aria-hidden="true">↗</span>
			</button>
		{/if}
	</header>
	{#if $account.session}
		<p class="persistence-note" role="status">{historyError || ($racePersistence?.state === "pending" ? "Saving race…" : $racePersistence?.state === "failed" ? "Race could not be saved. Live results remain available here." : $racePersistence?.state === "saved" ? "Race saved to your account." : "")} <a tabindex="0" href="#/history">Your history</a></p>
	{/if}

	{#if racers.length}
		<div class="race-overview" class:with-score={ownScore && series.length}>
			{#if series.length}
				<section class="race-card chart-card" aria-labelledby="race-speed-title">
					<h2 id="race-speed-title">Race pace</h2>
					<p>How each racer’s speed changed over the round.</p>
					<ResultsChart {series} />
				</section>
			{/if}

			{#if ownScore}
				<section class="race-card personal-card" aria-labelledby="personal-title">
					<h2 id="personal-title">Your result</h2>
					<p class="player-name">{ownScore.username}</p>
					<dl class="personal-metrics">
						<div><dt>Speed</dt><dd>{ownScore.wpm} <small>WPM</small></dd></div>
						<div><dt>Accuracy</dt><dd>{ownScore.accuracy}%</dd></div>
					</dl>
				</section>
			{/if}
		</div>

		<section class="race-card scores" aria-labelledby="scores-title">
			<h2 id="scores-title">Racer scores</h2>
			<table aria-labelledby="scores-title">
				<thead><tr><th scope="col">Racer</th><th scope="col">WPM</th><th scope="col">Accuracy</th></tr></thead>
				<tbody>
					{#each scores as racer (racer.userId)}
						<tr class:local={racer.userId === userId}>
							<th scope="row">
								<span class="racer-label">
									{#if racer.speedHistory.length || racer.finishSeconds !== undefined}<i class:dashed={racer.dashed} style:color={racer.color} aria-hidden="true"></i>{/if}
									<span>{racer.username}</span>
									{#if racer.userId === userId}<span class="you">You</span>{/if}
								</span>
							</th>
							<td>{racer.wpm}</td>
							<td>{racer.accuracy}%</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{:else}
		<p class="race-card empty">Finish a race to see your results here.</p>
	{/if}
</section>

<style>
	.persistence-note { color: var(--muted); font-size: var(--text-0_82rem); }
	.persistence-note a { color: var(--accent); text-decoration: underline; }
	.race-results { --result-border: color-mix(in srgb, var(--result-muted) 24%, transparent); }
	.results-heading { display: flex; align-items: end; justify-content: space-between; flex-wrap: wrap; gap: var(--dimension-0_9rem); margin-bottom: var(--dimension-1_35rem); }
	.results-heading .eyebrow { color: var(--result-accent); margin-bottom: var(--dimension-0_35rem); }
	h1 { font-size: clamp(var(--text-1_8rem), var(--text-4vw), var(--text-2_8rem)); line-height: var(--leading-1_12); }
	h2 { font-size: var(--text-1rem); font-weight: var(--weight-600); }
	.summary, .chart-card p, .player-name, .empty { color: var(--result-muted); font-size: var(--text-0_85rem); }
	.summary { margin-top: var(--dimension-0_35rem); }
	.replay { display: inline-flex; align-items: center; gap: var(--dimension-0_65rem); padding: var(--dimension-0_6rem) var(--dimension-0_9rem); border-radius: var(--radius-0_5rem); background: var(--result-accent); color: var(--accent-ink); font-size: var(--text-0_85rem); font-weight: var(--weight-700); }
	.replay:hover { filter: brightness(.93); }
	.race-overview { display: grid; gap: var(--dimension-0_85rem); }
	.race-overview.with-score { grid-template-columns: minmax(0, 1fr) minmax(var(--dimension-11rem), .27fr); }
	.race-card { min-width: 0; padding: clamp(var(--dimension-0_85rem), var(--dimension-2vw), var(--dimension-1_25rem)); border: var(--dimension-1px) solid var(--result-border); border-radius: var(--radius-0_75rem); background: var(--result-plot); }
	.chart-card p { margin: var(--dimension-0_2rem) 0 var(--dimension-0_75rem); }
	.personal-card { display: flex; flex-direction: column; background: color-mix(in srgb, var(--result-accent) 6%, var(--result-plot)); }
	.player-name { margin-top: var(--dimension-0_15rem); overflow-wrap: anywhere; }
	.personal-metrics { display: grid; gap: var(--dimension-0_8rem); margin: auto 0; padding-top: var(--dimension-0_9rem); }
	.personal-metrics dt { font-size: var(--text-0_85rem); color: var(--result-muted); }
	.personal-metrics dd { color: var(--result-accent); font-size: clamp(var(--text-1_8rem), var(--text-3_5vw), var(--text-2_75rem)); line-height: var(--leading-1_2); font-variant-numeric: tabular-nums; }
	.personal-metrics small { font-size: var(--text-0_8rem); }
	.scores { margin-top: var(--dimension-0_85rem); }
	table { width: 100%; margin-top: var(--dimension-0_35rem); border-collapse: separate; border-spacing: 0; font-size: var(--text-0_85rem); }
	th, td { padding: var(--dimension-0_6rem) var(--dimension-0_35rem); text-align: right; border-bottom: var(--dimension-1px) solid var(--result-grid); font-variant-numeric: tabular-nums; }
	th:first-child { text-align: left; }
	thead th { color: var(--result-muted); font-weight: var(--weight-400); }
	tbody tr:last-child > * { border-bottom: 0; }
	.local > * { background: color-mix(in srgb, var(--result-accent) 9%, transparent); }
	tr:has(+ .local) > *, table:has(tbody > .local:first-child) thead th { border-bottom-color: transparent; }
	.local > * { border-bottom-color: transparent; }
	.local > :first-child { border-start-start-radius: var(--radius-0_55rem); border-end-start-radius: var(--radius-0_55rem); }
	.local > :last-child { border-start-end-radius: var(--radius-0_55rem); border-end-end-radius: var(--radius-0_55rem); }
	.racer-label { display: flex; align-items: center; gap: var(--dimension-0_4rem); overflow-wrap: anywhere; }
	.racer-label i { flex: 0 0 var(--dimension-0_9rem); border-top: var(--dimension-2px) solid currentColor; }
	.racer-label i.dashed { border-top-style: dashed; }
	.you { flex: none; border: var(--dimension-1px) solid var(--result-border); border-radius: var(--radius-1rem); padding: var(--dimension-0_05rem) var(--dimension-0_35rem); color: var(--result-accent); font-size: var(--text-0_7rem); }

	@media (max-width: 42rem) {
		.race-overview.with-score { grid-template-columns: minmax(0, 1fr); }
		.personal-card { grid-row: 1; }
		.personal-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}
</style>
