<script lang="ts">
	import ArrowRight from "../../../components/icons/ArrowRightIcon.svelte";
	import { theme } from "../../../state/app.store";
	import { testConfig, updateTestConfigNumbers } from "../settings.store";
	import cn from "../../../utils";

	let numb = $derived($testConfig.numbers);
</script>

<div class="settings-list flex flex-col items-start w-full py-3 text-sm">
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && numb === null,
		})}
	>
		<button
			aria-pressed={numb === null}
			onclick={() => updateTestConfigNumbers(null)}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">None</span></button
		>
		<span class="w-40"></span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-primary": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && numb === "easy",
		})}
	>
		<button
			aria-pressed={numb === "easy"}
			onclick={() => updateTestConfigNumbers("easy")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Easy</span></button
		>
		<span class="w-40">15 words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && numb === "mid",
		})}
	>
		<button
			aria-pressed={numb === "mid"}
			onclick={() => updateTestConfigNumbers("mid")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Mid</span></button
		>
		<span class="w-40">10 words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-primary": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && numb === "hard",
		})}
	>
		<button
			aria-pressed={numb === "hard"}
			onclick={() => updateTestConfigNumbers("hard")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Hard</span></button
		>
		<span class="w-40">5 words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && numb === "insane",
		})}
	>
		<button
			aria-pressed={numb === "insane"}
			onclick={() => updateTestConfigNumbers("insane")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Insane</span></button
		>
		<span class="w-40">Every word</span>
	</p>
</div>
