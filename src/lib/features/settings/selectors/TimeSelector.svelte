<script lang="ts">
	import { practiceDurations } from "../../practice/practice-options";
	import WrenchSvg from "../../../components/icons/WrenchIcon.svelte";
	import { theme } from "../../../state/app.store";
	import {
		testConfig,
		updateModalContent,
		updateModalVisibility,
		updateTestConfigType,
	} from "../settings.store";
	import cn from "../../../utils";

	let timer = $derived($testConfig.timer);
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	{#each practiceDurations as value (value)}
		<button aria-pressed={timer === value} onclick={() => updateTestConfigType("timer", value)}>
			<span class={cn("tracking-wide", { "text-dark-forest-accent-main underline": $theme === "dark-forest" && timer === value })}>{value}</span>
		</button>
	{/each}
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
