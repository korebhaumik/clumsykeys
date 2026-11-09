<script lang="ts">
	import ArrowRight from "../../../components/icons/ArrowRightIcon.svelte";
	import { theme } from "../../../state/app.store";
	import { testConfig, updateTestConfigLanguage } from "../settings.store";
	import cn from "../../../utils";

	let lang = $derived($testConfig.language);
</script>

<div class="settings-list flex flex-col items-start w-full py-3 text-sm">
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && lang === "english",
		})}
	>
		<button
			aria-pressed={lang === "english"}
			onclick={() => updateTestConfigLanguage("english")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">English</span></button
		>
		<span class="w-40">200 words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-primary": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && lang === "english 2k",
		})}
	>
		<button
			aria-pressed={lang === "english 2k"}
			onclick={() => updateTestConfigLanguage("english 2k")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">English (Mid)</span></button
		>
		<span class="w-40">2K words</span>
	</p>
	
	<p
		class={cn("flex items-center transition w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && lang === "english 5k",
		})}
	>
		<button
			aria-pressed={lang === "english 5k"}
			onclick={() => updateTestConfigLanguage("english 5k")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">English (Hard)</span></button
		>
		<span class="w-40">5K words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-primary": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && lang === "hinglish",
		})}
	>
		<button
			aria-pressed={lang === "hinglish"}
			onclick={() => updateTestConfigLanguage("hinglish")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Hinglish</span></button
		>
		<span class="w-40">2K words</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && lang === "hindi",
		})}
	>
		<button
			aria-pressed={lang === "hindi"}
			onclick={() => updateTestConfigLanguage("hindi")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Hindi</span></button
		>
		<span class="w-40">500 words</span>
	</p>
</div>
