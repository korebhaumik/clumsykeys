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
			})}>Random English quote</span>
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
