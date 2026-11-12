<script lang="ts">
	import { modalConfig, updateModalContent, updateModalVisibility } from "./settings.store";
	import GlobeSvg from "../../components/icons/GlobeIcon.svelte";
	import AtSvg from "../../components/icons/AtIcon.svelte";
	import ToolsSvg from "../../components/icons/ToolsIcon.svelte";
	import HashtagSvg from "../../components/icons/HashtagIcon.svelte";
	import SettingsSvg from "../../components/icons/SettingsIcon.svelte";
	import RocketSvg from "../../components/icons/RocketIcon.svelte";
	import ArrowRight from "../../components/icons/ArrowRightIcon.svelte";
	import Language from "./panels/LanguagePanel.svelte";
	import Numbers from "./panels/NumbersPanel.svelte";
	import Punctuations from "./panels/PunctuationsPanel.svelte";
	import TestType from "./panels/TestTypePanel.svelte";
	import Difficulty from "./panels/DifficultyPanel.svelte";
	import SettingsDialog from "./SettingsDialog.svelte";

	let { onFocusFallback }: { onFocusFallback: () => void } = $props();

	const panels = {
		language: { title: "Language", icon: GlobeSvg, content: Language },
		numbers: { title: "Numbers", icon: HashtagSvg, content: Numbers },
		punctuations: { title: "Punctuations", icon: AtSvg, content: Punctuations },
		testType: { title: "Test Type", icon: ToolsSvg, content: TestType },
		difficulty: { title: "Difficulty", icon: RocketSvg, content: Difficulty },
	};
	const entries = Object.keys(panels) as (keyof typeof panels)[];
	let panel = $derived($modalConfig.content === "main" ? undefined : panels[$modalConfig.content]);

	function close() {
		updateModalVisibility(false);
	}

	function back() {
		updateModalContent("main");
	}

	function handleShortcut(event: KeyboardEvent) {
		if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
		event.preventDefault();
		updateModalVisibility();
	}
</script>

<svelte:window onkeydown={handleShortcut} />

<SettingsDialog open={$modalConfig.isVisible} title={panel?.title ?? "Test Settings"}
	icon={panel?.icon ?? SettingsSvg} onClose={close} onBack={panel ? back : undefined} {onFocusFallback}
>
	{#if panel}
		<panel.content />
	{:else}
		<div class="settings-list">
			{#each entries as key (key)}
				{@const item = panels[key]}
				<button class="settings-choice" type="button" onclick={() => updateModalContent(key)}>
					<item.icon />
					<span>{item.title}</span>
					<ArrowRight />
				</button>
			{/each}
		</div>
	{/if}
</SettingsDialog>
