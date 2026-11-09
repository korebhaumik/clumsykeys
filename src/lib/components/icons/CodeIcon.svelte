<script lang="ts">
 import Icon from "./Icon.svelte";
	let { className = "h-5 w-5" }: { className?: string } = $props();
</script>

<Icon class={className} fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
	<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16" />
</Icon>
