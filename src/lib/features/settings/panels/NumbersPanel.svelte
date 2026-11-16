<script lang="ts">
	import { testConfig, updateTestConfigNumbers } from "../settings.store";

	const options = [
		{ value: null, label: "None", detail: "" },
		{ value: "easy", label: "Easy", detail: "Every 15 words" },
		{ value: "mid", label: "Mid", detail: "Every 10 words" },
		{ value: "hard", label: "Hard", detail: "Every 5 words" },
		{ value: "insane", label: "Insane", detail: "Every word" },
	] as const;
</script>

<div class="settings-list">
	{#each options as { value, label, detail } (value)}
		<button tabindex="0" class="settings-choice" type="button" aria-label={label} aria-pressed={$testConfig.numbers === value} onclick={() => updateTestConfigNumbers(value)}>
			<span>{label}</span><small>{detail}</small>
		</button>
	{/each}
</div>
