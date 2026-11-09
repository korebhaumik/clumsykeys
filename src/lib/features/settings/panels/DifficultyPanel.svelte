<script lang="ts">
	import { theme } from "../../../state/app.store";
	import cn from "../../../utils";

	import TimerSvg from "../../../components/icons/TimerIcon.svelte";
	import HashSvg from "../../../components/icons/HashIcon.svelte";
	import AtSvg from "../../../components/icons/AtIcon.svelte";
</script>

<div
	class={cn("settings-fields p-4 my-4", {
		"bg-dark-forest-fade": $theme === "dark-forest",
		"bg-white": $theme === "classic",
	})}
>
	<div class="flex items-center gap-3 text-sm font-bold">
		<button
			class={cn("settings-primary flex gap-0.5 items-center p-2 rounded-sm", {
				"bg-dark-forest-accent-main": $theme === "dark-forest",
				"text-dark-forest-primary": $theme === "dark-forest",
			})}
		>
			<TimerSvg />
			<span>Timer - 60s</span>
		</button>
		<button
			class={cn("flex gap-0.5 items-center p-2 rounded-sm", {
				"text-dark-forest-accent-main": $theme === "dark-forest",
				"bg-dark-forest-primary": $theme === "dark-forest",
			})}
		>
			<HashSvg />
			<span>Numbers - None</span>
		</button>
		<button
			class={cn("flex gap-0.5 items-center p-2 rounded-sm", {
				"text-dark-forest-accent-main": $theme === "dark-forest",
				"bg-dark-forest-primary": $theme === "dark-forest",
			})}
		>
			<AtSvg />
			<span>Punctuations - None</span>
		</button>
	</div>

	
	<p
		class={cn("text-sm my-3 font-medium", {
			"text-dark-forest-highlighted": $theme === "dark-forest",
		})}
	>
		Set WPM and Accuracy limits for the test.
	</p>

	
	<div class="flex gap-2">
		<div class="flex gap-2">
			<input
				placeholder="Eg: 60"
				type="number"
				class={cn("py-2 w-32 outline-hidden border-none px-2 text-sm rounded-sm", {
					"bg-dark-forest-primary": $theme === "dark-forest",
					"bg-white": $theme === "classic",
				})}
			/>
			<button
				class={cn("settings-primary py-2 w-32 px-2 font-semibold text-sm rounded-sm", {
					"bg-dark-forest-accent-main": $theme === "dark-forest",
					"text-dark-forest-primary": $theme === "dark-forest",
					"bg-white": $theme === "classic",
				})}
			>
				WPM Limit
			</button>
		</div>
		<div class="flex gap-2">
			<input
				placeholder="Eg: 95%"
				type="number"
				class={cn("py-2 w-32 outline-hidden border-none px-2 text-sm rounded-sm", {
					"bg-dark-forest-primary": $theme === "dark-forest",
					"bg-white": $theme === "classic",
				})}
			/>
			<button
				class={cn("settings-primary py-2 w-32 px-2 font-semibold text-sm rounded-sm", {
					"bg-dark-forest-accent-main": $theme === "dark-forest",
					"text-dark-forest-primary": $theme === "dark-forest",
					"bg-white": $theme === "classic",
				})}
			>
				Acc. Limit
			</button>
		</div>
	</div>
</div>
