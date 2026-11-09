<script lang="ts">
	import WrenchSvg from "../../../components/icons/WrenchIcon.svelte";
	import { theme } from "../../../state/app.store";
	import {
		testConfig,
		updateModalContent,
		updateModalVisibility,
		updateTestConfigType,
	} from "../settings.store";
	import cn from "../../../utils";

	let quotes = $derived($testConfig.quotes);
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	<button
		aria-pressed={quotes === "Random Quotes"}
		onclick={() => {
			updateTestConfigType("quotes", "Random Quotes");
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline":
					$theme === "dark-forest" && quotes === "Random Quotes",
			})}>Random</span
		>
	</button>
	<button
		aria-pressed={quotes === "Movie Quotes"}
		onclick={() => {
			updateTestConfigType("quotes", "Movie Quotes");
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline":
					$theme === "dark-forest" && quotes === "Movie Quotes",
			})}>Movie</span
		>
	</button>
	<button
		aria-pressed={quotes === "Famous Quotes"}
		onclick={() => {
			updateTestConfigType("quotes", "Famous Quotes");
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline":
					$theme === "dark-forest" && quotes === "Famous Quotes",
			})}>Famous</span
		>
	</button>
	
	<button
		aria-label="Customize test type"
		onclick={() => {
			updateModalContent("testType");
			updateModalVisibility();
		}}
	>
		<WrenchSvg variant="" />
	</button>
</div>
