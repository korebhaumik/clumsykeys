<script lang="ts">
	import ArrowRight from "../../../components/icons/ArrowRightIcon.svelte";
	import { theme } from "../../../state/app.store";
	import { testConfig, updateTestConfigPunctuations } from "../settings.store";
	import cn from "../../../utils";

	let punc = $derived($testConfig.punctuations);
</script>

<div class="settings-list flex flex-col items-start w-full py-3 text-sm">
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && punc === null,
		})}
	>
		<button
			aria-pressed={punc === null}
			onclick={() => updateTestConfigPunctuations(null)}
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
			"text-dark-forest-accent-main": $theme === "dark-forest" && punc === "easy",
		})}
	>
		<button
			aria-pressed={punc === "easy"}
			onclick={() => updateTestConfigPunctuations("easy")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Easy</span></button
		>
		<span class="w-40">\\ , . ! “ ? ‘ : ; \\</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && punc === "mid",
		})}
	>
		<button
			aria-pressed={punc === "mid"}
			onclick={() => updateTestConfigPunctuations("mid")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Mid</span></button
		>
		<span class="w-40">\\ @ # $ % & * \\</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-primary": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && punc === "hard",
		})}
	>
		<button
			aria-pressed={punc === "hard"}
			onclick={() => updateTestConfigPunctuations("hard")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Hard</span></button
		>
		<span class="w-40">\\ ( ) _ - = + [ ] \\</span>
	</p>
	
	<p
		class={cn("flex items-center w-full", {
			"bg-dark-forest-fade": $theme === "dark-forest",
			"text-dark-forest-accent-main": $theme === "dark-forest" && punc === "insane",
		})}
	>
		<button
			aria-pressed={punc === "insane"}
			onclick={() => updateTestConfigPunctuations("insane")}
			class={cn("flex items-center w-full px-5 py-3 text-left align-baseline")}
		>
			<ArrowRight />
			<span class="ml-2">Insane</span></button
		>
		<span class="w-40">{"\\\\ ~ ` | { } \\\\"}</span>
	</p>
</div>
