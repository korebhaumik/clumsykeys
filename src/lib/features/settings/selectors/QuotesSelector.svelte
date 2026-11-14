<script lang="ts">
	import WrenchSvg from "../../../components/icons/WrenchIcon.svelte";
	import QuoteLengthOptions from "./QuoteLengthOptions.svelte";
	import { updateModalContent, updateModalVisibility } from "../settings.store";
</script>

<div class="flex items-center justify-between gap-4 min-w-32">
	<QuoteLengthOptions />
	<button
		aria-label="Customize test type"
		onclick={() => {
			updateModalContent("testType");
			updateModalVisibility();
		}}
	>
		<WrenchSvg variant="" />
	</button>
</div>
