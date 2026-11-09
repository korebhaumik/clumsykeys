<script lang="ts">
	import { theme } from "../../../state/app.store";
	import cn from "../../../utils";
	import QuotesSvg from "../../../components/icons/QuotesIcon.svelte";
	import TimerSvg from "../../../components/icons/TimerIcon.svelte";
	import { testConfig, updateTestConfigType } from "../settings.store";

	let selectedTestType = $derived($testConfig.timer
		? "timer"
		: $testConfig.quotes
			? "quotes"
			: $testConfig.words
				? "words"
				: "none");
</script>

<div
	class={cn("settings-fields p-4 my-4", {
		"bg-dark-forest-fade": $theme === "dark-forest",
		"bg-white": $theme === "classic",
	})}
>
	<div
		class={cn("flex  items-center gap-3 text-sm font-bold", {
			"text-dark-forest-accent-main": $theme === "dark-forest",
		})}
	>
		<button
			aria-pressed={selectedTestType === "timer"}
			onclick={() => {
				updateTestConfigType("timer", 30);
			}}
			class={cn("flex gap-0.5 items-center p-2 rounded-sm", {
				"bg-dark-forest-primary": $theme === "dark-forest",
				"bg-dark-forest-accent-main text-dark-forest-primary":
					$theme === "dark-forest" && $testConfig.timer,
			})}
		>
			<TimerSvg />
			<span>Timer</span>
		</button>
		<button
			aria-pressed={selectedTestType === "words"}
			onclick={() => {
				updateTestConfigType("words", 50);
			}}
			class={cn("flex gap-0.5 items-center p-2  rounded-sm", {
				"bg-dark-forest-primary": $theme === "dark-forest",
				"bg-dark-forest-accent-main text-dark-forest-primary":
					$theme === "dark-forest" && $testConfig.words,
			})}
		>
			<span class="font-bold">Aa</span>
			<span>Words</span>
		</button>
		<button
			aria-pressed={selectedTestType === "quotes"}
			onclick={() => {
				updateTestConfigType("quotes", "Famous Quotes");
			}}
			class={cn("flex gap-0.5 items-center p-2  rounded-sm", {
				"bg-dark-forest-primary": $theme === "dark-forest",
				"bg-dark-forest-accent-main text-dark-forest-primary":
					$theme === "dark-forest" && $testConfig.quotes,
			})}
		>
			<QuotesSvg />
			<span>Quotes</span>
		</button>
	</div>

	
	{#if selectedTestType === "timer"}
		<p
			class={cn("text-sm my-3 font-medium", {
				"text-dark-forest-highlighted": $theme === "dark-forest",
			})}
		>
			Set a timer for the test with a duration ranging from 5 to 1000 seconds. You can adjust the
			duration later through the Test-Setting menu (click "Test Settings" or press Ctrl/Cmd + K &gt;
			Test-Type).
		</p>
	{/if}
	{#if selectedTestType === "words"}
		<p
			class={cn("text-sm my-3 font-medium", {
				"text-dark-forest-highlighted": $theme === "dark-forest",
			})}
		>
			Set a stopper for the test with a word limit ranging from 10 to 1000 words. You can adjust the
			word limit later through the Test-Setting menu (click "Test Settings" or press Ctrl/Cmd +
			K &gt;
			Test-Type).
		</p>
	{/if}
	{#if selectedTestType === "quotes"}
		<p
			class={cn("text-sm my-3 font-medium", {
				"text-dark-forest-highlighted": $theme === "dark-forest",
			})}
		>
			Set a stopper for the test with randomized quotes. You can adjust the type of quotes later
			through the Test-Setting menu (click "Test Settings" or press Ctrl/Cmd + K &gt;
			Test-Type).
		</p>
	{/if}

	
	<div class="flex gap-2">
		<input
			placeholder={selectedTestType === "quotes" ? "Eg: Random Quotes" : "Eg: 50"}
			type={selectedTestType === "quotes" ? "string" : "number"}
			class={cn("py-2 w-60 outline-hidden border-none px-2 text-sm rounded-sm", {
				"bg-dark-forest-primary": $theme === "dark-forest",
				"bg-white": $theme === "classic",
			})}
		/>

		<button
			class={cn("settings-primary py-2 w-32 px-2 font-semibold text-sm rounded-sm", {
				"bg-dark-forest-accent-main": $theme === "dark-forest",
				"text-dark-forest-primary": $theme === "dark-forest",
				"bg-white": $theme === "classic",
			})}
		>
			Set {selectedTestType}
		</button>
	</div>
</div>
