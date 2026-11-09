<script lang="ts">
	import { game } from "../lib/state/app.store";
	import Config from "../lib/features/settings/PracticeSettings.svelte";
	import EngineNormal from "../lib/features/practice/ProsePractice.svelte";
	import Modal from "../lib/features/settings/SettingsModal.svelte";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";
</script>

<Modal />
<PracticeLayout mode="prose" active={$game === "playing"} finished={$game === "finished"}>
	{#if $game !== "finished"}<Config />{/if}
	<EngineNormal />
</PracticeLayout>
