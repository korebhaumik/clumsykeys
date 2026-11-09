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

	let timer = $derived($testConfig.timer);
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	<button
		aria-pressed={timer === 15}
		onclick={() => {
			updateTestConfigType("timer", 15);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && timer === 15,
			})}>15</span
		>
	</button>
	<button
		aria-pressed={timer === 30}
		onclick={() => {
			updateTestConfigType("timer", 30);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && timer === 30,
			})}>30</span
		>
	</button>
	<button
		aria-pressed={timer === 60}
		onclick={() => {
			updateTestConfigType("timer", 60);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && timer === 60,
			})}>60</span
		>
	</button>
	<button
		aria-pressed={timer === 120}
		onclick={() => {
			updateTestConfigType("timer", 120);
		}}
	>
		<span
			class={cn("tracking-wide", {
				"text-dark-forest-accent-main underline": $theme === "dark-forest" && timer === 120,
			})}>120</span
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
