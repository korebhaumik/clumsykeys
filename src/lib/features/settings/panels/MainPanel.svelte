<script>
	import AtSvg from "../../../components/icons/AtIcon.svelte";
	import CrossSvg from "../../../components/icons/CrossIcon.svelte";
	import GlobeSvg from "../../../components/icons/GlobeIcon.svelte";
	import HashSvg from "../../../components/icons/HashIcon.svelte";
	import RocketSvg from "../../../components/icons/RocketIcon.svelte";
	import SettingsSvg from "../../../components/icons/SettingsIcon.svelte";
	import ToolsSvg from "../../../components/icons/ToolsIcon.svelte";
	import { theme } from "../../../state/app.store";
	import { updateModalContent, updateModalVisibility } from "../settings.store";
	import cn from "../../../utils";
</script>

<header
	class={cn("flex w-full justify-between items-center px-5 pt-4", {
		"text-dark-forest-accent-main": $theme === "dark-forest",
	})}
>
	<div class={cn("flex items-center")}>
		<SettingsSvg />
		<h1 class="ml-2 font-medium">Test Settings</h1>
	</div>
	<button type="button" aria-label="Close settings" onclick={() => updateModalVisibility(false)}><CrossSvg
		className={cn("w-6 h-6 cursor-pointer", {
			"text-dark-forest-accent-error": $theme === "dark-forest",
		})}
	/></button>
</header>

<div class="settings-list flex flex-col items-start w-full py-3 text-sm">
	
	<button
		class={cn("flex items-center w-full px-5 py-3 text-left align-baseline", {
			"bg-dark-forest-fade": $theme === "dark-forest",
		})}
		onclick={() => updateModalContent("language")}
	>
		<GlobeSvg />
		<span class="ml-2">Language</span>
	</button>
	
	<button
		class={cn("flex items-center w-full px-5 py-3 text-left align-baseline", {
			"bg-dark-forest-": $theme === "dark-forest",
		})}
		onclick={() => updateModalContent("numbers")}
	>
		<HashSvg />
		<span class="ml-2">Numbers</span>
	</button>
	
	<button
		class={cn("flex items-center w-full px-5 py-3 text-left align-baseline", {
			"bg-dark-forest-fade": $theme === "dark-forest",
		})}
		onclick={() => updateModalContent("punctuations")}
	>
		<AtSvg />
		<span class="ml-2">Punctuations</span>
	</button>
	
	<button
		class={cn("flex items-center w-full px-5 py-3 text-left align-baseline", {
			"bg-dark-forest-": $theme === "dark-forest",
		})}
		onclick={() => updateModalContent("testType")}
	>
		<ToolsSvg />
		<span class="ml-2">Test Type</span>
	</button>
	
	<button
		class={cn("flex items-center w-full px-5 py-3 text-left align-baseline", {
			"bg-dark-forest-fade": $theme === "dark-forest",
		})}
		onclick={() => updateModalContent("difficulty")}
	>
		<RocketSvg />
		<span class="ml-2">Difficulty</span>
	</button>
</div>
