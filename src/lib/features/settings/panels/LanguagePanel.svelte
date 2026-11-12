<script lang="ts">
	import { testConfig, updateTestConfigLanguage } from "../settings.store";

	const languages = [
		{ value: "english", label: "English", size: "200 words" },
		{ value: "english 1k", label: "English 1K", size: "1K words" },
		{ value: "english 2k", label: "English (Mid)", size: "2K words" },
		{ value: "english 5k", label: "English (Hard)", size: "5K words" },
		{ value: "hinglish", label: "Hinglish", size: "207 words" },
	] as const;
</script>

<div class="settings-list">
	{#each languages as { value, label, size } (value)}
		<button class="settings-choice" type="button" aria-label={label} aria-pressed={$testConfig.language === value} onclick={() => updateTestConfigLanguage(value)}>
			<span>{label}</span><small>{size}</small>
		</button>
	{/each}
</div>
