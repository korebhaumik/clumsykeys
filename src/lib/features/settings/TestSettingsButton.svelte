<script lang="ts">
	import SettingsSvg from "../../components/icons/SettingsIcon.svelte";

	let { onclick, disabled = false }: { onclick: () => void; disabled?: boolean } = $props();
</script>

<button
	type="button"
	class="settings-label cursor-pointer disabled:cursor-not-allowed"
	{disabled}
	{onclick}
>
	<SettingsSvg className="h-6 w-6" />
	<span>Test Settings</span>
</button>
