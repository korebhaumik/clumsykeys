<script lang="ts">
	import { testConfig, updateTestConfigLanguage } from "../settings.store";

	import { proseLanguages } from "../../practice/practice-options";
</script>

<div class="settings-list">
	{#each proseLanguages as { value, label, size } (value)}
		<button class="settings-choice" type="button" aria-label={label} aria-pressed={$testConfig.language === value} onclick={() => updateTestConfigLanguage(value)}>
			<span>{label}</span><small>{size}</small>
		</button>
	{/each}
</div>
