<script lang="ts">
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";
</script>

<PracticeLayout mode="prose" contentLabel="About Clumsy Keys" showShortcuts={false}>
	<div class="page-heading">
		<p class="eyebrow">Clumsy Keys</p>
		<h1>About</h1>
		<p class="lede">Clumsy Keys is a typing playground for practicing prose, typing code, and racing friends.</p>
	</div>

	<section class="panel narrow stack" aria-labelledby="about-practice">
		<h2 id="about-practice" class="panel-title">Find your practice mode</h2>
		<nav class="flex flex-wrap gap-2" aria-label="Practice modes">
			<a class="button button-secondary" href="#/">Prose practice</a>
			<a class="button button-secondary" href="#/game">Code practice</a>
			<a class="button button-secondary" href="#/race">Multiplayer</a>
		</nav>
	</section>
</PracticeLayout>
