<script lang="ts">
	import QuotesSvg from "../../components/icons/QuotesIcon.svelte";
	import TestSettingsButton from "./TestSettingsButton.svelte";
	import TimerSvg from "../../components/icons/TimerIcon.svelte";
	import { game, theme } from "../../state/app.store";
	import cn from "../../utils";
	import AtSvg from "../../components/icons/AtIcon.svelte";
	import HashSvg from "../../components/icons/HashIcon.svelte";
	import LangSvg from "../../components/icons/LangIcon.svelte";
	import {
		testConfig,
		updateModalContent,
		updateModalVisibility,
		updateTestConfigType,
	} from "./settings.store";
	import { fade } from "svelte/transition";
	import PracticeLiveStats from "../practice/PracticeLiveStats.svelte";
	import { practiceStats } from "../../state/app.store";
	import TimeSelector from "./selectors/TimeSelector.svelte";
	import WordsSelector from "./selectors/WordsSelector.svelte";
	import QuotesSelector from "./selectors/QuotesSelector.svelte";


	let { race = false }: { race?: boolean } = $props();
</script>



<section aria-label="Test settings" class:race-config={race}>
	<div class={cn("flex flex-wrap gap-3", race ? "text-sm" : "max-w-[var(--dimension-60rem)]")}>
		<TestSettingsButton disabled={$game === "playing"} onclick={() => {
			updateModalContent("main");
			updateModalVisibility(true);
		}} />
		
		{#if race || $game === "waiting"}
			<div
				in:fade={{ duration: 200 }}
				class={cn(
					`config-options hidden font-semibold items-center px-4 hd:flex  max-w-[var(--dimension-55rem)] rounded-lg justify-between`,
					{
						"bg-dark-forest-fade": $theme === "dark-forest",
						"text-dark-forest-unhighlighted": $theme === "dark-forest",
						"bg-black": $theme === "classic",
						"text-white/60": $theme === "classic",
					}
				)}
			>
				<div class={cn("flex items-center justify-between", race ? "gap-3" : "min-w-64")}>
					<button tabindex="0"
						aria-pressed={!!$testConfig.timer}
						onclick={() => {
							updateTestConfigType("timer", 30);
						}}
						class={cn("flex items-center", {
							"text-dark-forest-accent-main underline":
								$theme === "dark-forest" && $testConfig.timer,
						})}
					>
						<TimerSvg />
						<span class="ml-1 tracking-wide">time</span>
					</button>
					<button tabindex="0"
						aria-pressed={!!$testConfig.words}
						onclick={() => {
							updateTestConfigType("words", 25);
						}}
						class={cn("flex items-center", {
							"text-dark-forest-accent-main underline":
								$theme === "dark-forest" && $testConfig.words,
						})}
					>
						<span class="font-bold">Aa</span>
						<span class="ml-1 tracking-wide">words</span>
					</button>
					<button tabindex="0"
						aria-pressed={!!$testConfig.quotes}
						onclick={() => {
							updateTestConfigType("quotes", "Random Quotes");
						}}
						class={cn("flex items-center", {
							"text-dark-forest-accent-main underline":
								$theme === "dark-forest" && $testConfig.quotes,
						})}
					>
						<QuotesSvg />
						<span class="ml-1 tracking-wide">quotes</span>
					</button>
				</div>
				<hr
					class={cn("w-1 border-none rounded-full h-7", race ? "mx-3" : "mx-5", {
						"bg-dark-forest-primary": $theme === "dark-forest",
						"bg-white/80": $theme === "classic",
					})}
				/>
				

				{#if $testConfig.timer}
					<TimeSelector />
				{/if}
				{#if $testConfig.words}
					<WordsSelector />
				{/if}
				{#if $testConfig.quotes}
					<QuotesSelector />
				{/if}
			</div>
			
			<div
				in:fade={{ duration: 200 }}
				class={cn(`config-options hidden font-semibold px-4 hd:flex py-3 w-fit rounded-lg justify-between`, {
					"bg-dark-forest-fade": $theme === "dark-forest",
					"text-dark-forest-unhighlighted": $theme === "dark-forest",
					"bg-black": $theme === "classic",
					"text-white/60": $theme === "classic",
				})}
			>
				<div class={cn("flex items-center justify-between", race ? "gap-3" : "min-w-64")}>
					<button tabindex="0"
						onclick={() => {
							updateModalContent("punctuations");
							updateModalVisibility();
						}}
						class={cn("flex items-center", {
							"text-dark-forest-accent-main": $theme !== "classic" && $testConfig.punctuations,
							"text-white underline": $theme === "classic" && $testConfig.punctuations,
						})}
					>
						<AtSvg />
						<span class="ml-1 tracking-wide">punctuations</span>
					</button>
					<button tabindex="0"
						onclick={() => {
							updateModalContent("numbers");
							updateModalVisibility();
						}}
						class={cn("flex items-center", {
							"text-dark-forest-accent-main": $theme !== "classic" && $testConfig.numbers,
							"text-white underline": $theme === "classic" && $testConfig.numbers,
						})}
					>
						<HashSvg />
						<span class="ml-1 tracking-wide"
							>numbers
							
						</span>
					</button>
				</div>
				<hr
					class={cn("w-1 border-none rounded-full h-7", race ? "mx-3" : "mx-5", {
						"bg-dark-forest-primary": $theme === "dark-forest",
						"bg-white/80": $theme === "classic",
					})}
				/>
				<div
					class={cn("flex items-center underline justify-between gap-4",
						$theme === "dark-forest" ? "text-dark-forest-accent-main" : "text-white")}
				>
					<button tabindex="0"
						class="flex items-center"
						onclick={() => {
							updateModalVisibility();
							updateModalContent("language");
						}}
					>
						<LangSvg />
						<span class="ml-1 tracking-wide">{$testConfig.language}</span>
					</button>
				</div>
			</div>
		{/if}

		
		
	</div>

	{#if !race && $game === "playing"}
		<PracticeLiveStats stats={$practiceStats} />
	{/if}
</section>

<style>
	:global([data-theme="classic"]) .config-options :global(button[aria-pressed="true"]) {
		color: var(--accent-ink);
		text-decoration: underline;
	}
	:global([data-theme="classic"]) .config-options { --focus-highlight: var(--accent-ink); }
</style>
