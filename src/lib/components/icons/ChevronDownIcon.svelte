<script lang="ts">
	import Icon from "./Icon.svelte";
	let { className = "" }: { className?: string } = $props();
</script>

<Icon class={className} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
	<path d="m6 9 6 6 6-6" />
</Icon>
