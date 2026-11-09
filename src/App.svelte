<script lang="ts">
	import Router from "./lib/Router.svelte";
	import { theme, themeBackgrounds } from "./lib/state/app.store";

	$effect(() => {
		const background = themeBackgrounds[$theme];
		document.body.classList.add(background);
		return () => document.body.classList.remove(background);
	});
</script>

<main class="py-5" data-theme={$theme}>
	<Router />
</main>
