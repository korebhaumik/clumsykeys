<script lang="ts">
	import { fade, scale, fly } from "svelte/transition";
	import {
		modalConfig,
		updateModalContent,
		updateModalVisibility,

	} from "./settings.store";

	import GlobeSvg from "../../components/icons/GlobeIcon.svelte";

	import cn from "../../utils";
	import { theme } from "../../state/app.store";

	import AtSvg from "../../components/icons/AtIcon.svelte";
	import ToolsSvg from "../../components/icons/ToolsIcon.svelte";

	import CrossSvg from "../../components/icons/CrossIcon.svelte";

	import Language from "./panels/LanguagePanel.svelte";
	import Numbers from "./panels/NumbersPanel.svelte";
	import Main from "./panels/MainPanel.svelte";
	import HashtagSvg from "../../components/icons/HashtagIcon.svelte";
	import TestType from "./panels/TestTypePanel.svelte";
	import { onMount } from "svelte";
	import Punctuations from "./panels/PunctuationsPanel.svelte";
	import Difficulty from "./panels/DifficultyPanel.svelte";


    const panels = {
        language: { title: "Language", icon: GlobeSvg, content: Language },
        numbers: { title: "Numbers", icon: HashtagSvg, content: Numbers },
        punctuations: { title: "Punctuations", icon: AtSvg, content: Punctuations },
        testType: { title: "Test Type", icon: ToolsSvg, content: TestType },
        difficulty: { title: "Difficulty", icon: ToolsSvg, content: Difficulty },
    };

	const escapeKeyListener = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		if ($modalConfig.content === "main") {
			updateModalVisibility(false);
		} else {
			updateModalContent("main");
		}
	};
	const toggleKeyListener = (event: KeyboardEvent) => {
		if (event.key === "k" && event.metaKey) {
			updateModalVisibility();
		}
	};

	onMount(() => {
		window.addEventListener("keydown", toggleKeyListener);
		return () => {
			window.removeEventListener("keydown", toggleKeyListener);
		};
	});

	$effect(() => {
		if (!$modalConfig.isVisible) return;
		window.addEventListener("keydown", escapeKeyListener);
		return () => window.removeEventListener("keydown", escapeKeyListener);
	});
</script>

{#if $modalConfig.isVisible}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 200 }}
		class="absolute top-0 bottom-0 left-0 right-0 z-10 w-screen h-screen backdrop-blur-xs bg-black/40"
		onclick={() => {
			updateModalVisibility();
		}}
	></div>
	
	<div class="absolute z-20 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
		<div transition:scale={{ start: 0.95, delay: 0, duration: 400 }}>
			<div
				class={cn("settings-modal rounded-xl w-80 mx-auto sm:w-[var(--dimension-35rem)] border h-fit", {
					"bg-dark-forest-primary text-dark-forest-unhighlighted border-dark-forest-fade":
						$theme === "dark-forest",
					"bg-black text-white border-black": $theme === "classic",
				})}
				transition:fly={{ duration: 400, y: 4 }}
			>
				{#if $modalConfig.content === "main"}
                    <Main />
                {:else}
                    {@const panel = panels[$modalConfig.content]}
                    <header class={cn("flex w-full justify-between items-center px-5 pt-4", {
                        "text-dark-forest-accent-main": $theme === "dark-forest",
                        "text-white": $theme === "classic" && $modalConfig.content === "language",
                    })}>
                        <div class="flex items-center"><panel.icon /><h1 class="ml-2 font-medium">{panel.title}</h1></div>
                        <button type="button" aria-label="Close settings" onclick={() => updateModalVisibility(false)}>
                            <CrossSvg className={cn("w-6 h-6 cursor-pointer", {"text-dark-forest-accent-error": $theme === "dark-forest"})} />
                        </button>
                    </header>
                    <panel.content />
                {/if}
				<footer
					class={cn("flex gap-5 items-center px-5 pb-3", {
						// "text-dark-forest-accent-main": $theme === "dark-forest",
					})}
				>
					<div class="flex gap-2 items-center text-xs font-bold">
						<span
							class={cn("settings-key px-2 py-1 rounded-sm", {
								"bg-dark-forest-unhighlighted text-dark-forest-primary": $theme === "dark-forest",
							})}>Esc</span
						>
						<span class="">Prev Menu</span>
					</div>
					<div class="flex gap-2 items-center text-xs font-bold">
						<span
							class={cn("settings-key px-2 py-1 rounded-sm", {
								"bg-dark-forest-unhighlighted text-dark-forest-primary": $theme === "dark-forest",
							})}>Ctrl</span
						>
						<span
							class={cn("settings-key px-2 py-1 rounded-sm", {
								"bg-dark-forest-unhighlighted text-dark-forest-primary": $theme === "dark-forest",
							})}>k</span
						>
						<span>Toggle Menu</span>
					</div>
				</footer>
			</div>
		</div>
	</div>
{/if}

<style>
	:global([data-theme="classic"]) .settings-modal :global(button:focus-visible) { outline-color: var(--accent-ink); }
	:global([data-theme="classic"]) .settings-modal :global(.settings-list button:hover),
	:global([data-theme="classic"]) .settings-modal :global(.settings-list p:has(> button[aria-pressed="true"])) {
		background: var(--palette-neutral-800);
	}
	:global([data-theme="classic"]) .settings-modal :global(.settings-list button[aria-pressed="true"]) {
		text-decoration: underline;
	}
	:global([data-theme="classic"]) .settings-modal :global(.settings-fields),
	:global([data-theme="classic"]) .settings-key {
		background: var(--surface);
		color: var(--ink);
	}
	:global([data-theme="classic"]) .settings-modal :global(.settings-fields :is(input, button)) {
		background: var(--inset);
		border: var(--dimension-1px) solid var(--line);
	}
	:global([data-theme="classic"]) .settings-modal :global(.settings-fields button:is([aria-pressed="true"], .settings-primary)) {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: var(--accent);
	}
	:global([data-theme="classic"]) .settings-modal :global(.settings-fields button:focus-visible) {
		outline-color: var(--ink);
	}
</style>
