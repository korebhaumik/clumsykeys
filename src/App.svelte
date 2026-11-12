<script lang="ts">
	import Router from "./lib/Router.svelte";
	import { theme } from "./lib/state/app.store";

	$effect(() => {
		document.documentElement.dataset.theme = $theme;
	});
</script>

<main class="py-5">
	<Router />
</main>
