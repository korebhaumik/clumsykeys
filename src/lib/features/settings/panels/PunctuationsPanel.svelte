<script lang="ts">
	import { testConfig, updateTestConfigPunctuations } from "../settings.store";

	const options = [
		{ value: null, label: "None", detail: "" },
		{ value: "easy", label: "Easy", detail: ", . ! \" ? ' : ;" },
		{ value: "mid", label: "Mid", detail: "@ # $ % & *" },
		{ value: "hard", label: "Hard", detail: "( ) _ - = + [ ]" },
		{ value: "insane", label: "Insane", detail: "~ ` | { }" },
	] as const;
</script>

<div class="settings-list">
	{#each options as { value, label, detail } (value)}
		<button tabindex="0" class="settings-choice" type="button" aria-label={label} aria-pressed={$testConfig.punctuations === value} onclick={() => updateTestConfigPunctuations(value)}>
			<span>{label}</span><small>{detail}</small>
		</button>
	{/each}
</div>
