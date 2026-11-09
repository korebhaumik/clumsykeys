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

	let words = $derived($testConfig.words);
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	<button
		aria-pressed={words === 25}
		onclick={() => {
			updateTestConfigType("words", 25);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && words === 25,
			})}>25</span
		>
	</button>
	<button
		aria-pressed={words === 50}
		onclick={() => {
			updateTestConfigType("words", 50);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && words === 50,
			})}>50</span
		>
	</button>
	<button
		aria-pressed={words === 100}
		onclick={() => {
			updateTestConfigType("words", 100);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && words === 100,
			})}>100</span
		>
	</button>
	<button
		aria-pressed={words === 200}
		onclick={() => {
			updateTestConfigType("words", 200);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && words === 200,
			})}>200</span
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
