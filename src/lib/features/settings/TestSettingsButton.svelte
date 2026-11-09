<script lang="ts">
	import SettingsSvg from "../../components/icons/SettingsIcon.svelte";

	let { onclick }: { onclick: () => void } = $props();
</script>

<button
	type="button"
	class="settings-label cursor-pointer"
	{onclick}
>
	<SettingsSvg className="h-6 w-6" />
	<span>Test Settings</span>
</button>
