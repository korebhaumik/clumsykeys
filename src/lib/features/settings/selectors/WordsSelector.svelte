<script lang="ts">
	import { practiceWordCounts } from "../../practice/practice-options";
	import WrenchSvg from "../../../components/icons/WrenchIcon.svelte";
	import { theme } from "../../../state/app.store";
	import {
		testConfig,
		updateModalContent,
		updateModalVisibility,
		updateTestConfigType,
	} from "../settings.store";
	import cn from "../../../utils";

	let words = $derived($testConfig.words);
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	{#each practiceWordCounts as value (value)}
		<button tabindex="0" aria-pressed={words === value} onclick={() => updateTestConfigType("words", value)}>
			<span class={cn("tracking-wide", { "text-dark-forest-accent-main underline": $theme === "dark-forest" && words === value })}>{value}</span>
		</button>
	{/each}
	<button tabindex="0"
		aria-label="Customize test type"
		onclick={() => {
			updateModalContent("testType");
			updateModalVisibility();
		}}
	>
		<WrenchSvg variant="" />
	</button>
</div>
