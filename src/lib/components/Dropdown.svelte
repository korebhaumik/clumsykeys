<script lang="ts" generics="T extends string | number">
	import { tick } from "svelte";
	import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";

	let { value, options, label, describedBy, disabled = false, compact = false, onchange }: {
		value: T;
		options: readonly { value: T; label: string }[];
		label: string;
		describedBy?: string;
		disabled?: boolean;
		compact?: boolean;
		onchange: (value: T) => void;
	} = $props();

	const id = $props.id();
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;
	let open = $state(false);
	let upwards = $state(false);
	let active = $state(0);
	let search = "";
	let searchedAt = 0;
	const selected = $derived(options.find(option => option.value === value));

	$effect(() => {
		if (disabled) open = false;
	});

	$effect(() => {
		if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
	});

	function show() {
		if (disabled || trigger.matches(':disabled')) return;
		active = Math.max(0, options.findIndex(option => option.value === value));
		const rect = trigger.getBoundingClientRect();
		const menuHeight = Math.min(11 * parseFloat(window.getComputedStyle(document.documentElement).fontSize), window.innerHeight * 0.4);
		upwards = rect.bottom + menuHeight > window.innerHeight && rect.top > window.innerHeight - rect.bottom;
		open = true;
		search = "";
	}

	async function choose(index: number) {
		if (disabled || trigger.matches(':disabled') || !options[index]) return;
		open = false;
		onchange(options[index].value);
		await tick();
		trigger?.focus();
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === "Escape" && open) {
			event.preventDefault();
			event.stopPropagation();
			open = false;
		} else if (event.key === "Tab") {
			open = false;
		} else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
			event.preventDefault();
			if (!open) show();
			else if (event.key === "ArrowDown") active = (active + 1) % options.length;
			else if (event.key === "ArrowUp") active = (active - 1 + options.length) % options.length;
			if (event.key === "Home") active = 0;
			if (event.key === "End") active = options.length - 1;
		} else if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			if (open) void choose(active);
			else show();
		} else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault();
			if (!open) show();
			const now = Date.now();
			search = (now - searchedAt > 700 ? "" : search) + event.key.toLowerCase();
			searchedAt = now;
			const match = options.findIndex(option => option.label.toLowerCase().startsWith(search));
			if (match >= 0) active = match;
		}
	}
</script>

<svelte:window onpointerdown={(event) => { if (!root.contains(event.target as HTMLElement)) open = false; }} />

<div class="dropdown" class:compact bind:this={root} onfocusout={(event) => {
	if (!root.contains(event.relatedTarget as HTMLElement)) open = false;
}}>
	<button bind:this={trigger} type="button" role="combobox" aria-label={label}
		aria-describedby={describedBy} aria-expanded={open} aria-haspopup="listbox"
		aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
		{disabled} class="dropdown-trigger" onclick={() => open ? open = false : show()} onkeydown={keydown}>
		<span>{selected?.label ?? "Choose an option"}</span>
		<ChevronDownIcon className="h-4 w-4 shrink-0" />
	</button>
	{#if open}
		<div id={`${id}-list`} role="listbox" aria-label={label} class="dropdown-options" class:upwards>
			{#each options as option, index (option.value)}
				<div id={`${id}-option-${index}`} role="option" aria-selected={option.value === value}
					tabindex="-1" class="dropdown-option" class:active={active === index}
					onpointermove={() => active = index} onpointerdown={(event) => event.preventDefault()}
					onclick={() => choose(index)} onkeydown={keydown}>
					<span>{option.label}</span><span aria-hidden="true">{option.value === value ? "✓" : ""}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown { position: relative; min-width: 0; width: 100%; font-weight: var(--weight-400); }
	.dropdown-trigger { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-0_75rem); width: 100%; min-height: var(--settings-control-height); padding: var(--dimension-0_5rem) var(--dimension-0_8rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--inset); color: var(--ink); text-align: start; cursor: pointer; }
	.dropdown-trigger:disabled { cursor: not-allowed; }
	.dropdown-trigger > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dropdown-options { position: absolute; z-index: 10; inset-inline: 0; top: calc(100% + var(--dimension-0_25rem)); max-height: min(var(--dimension-11rem), 40vh); overflow-y: auto; padding: var(--dimension-0_25rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_55rem); background: var(--surface); color: var(--ink); }
	.dropdown-options.upwards { top: auto; bottom: calc(100% + var(--dimension-0_25rem)); }
	.dropdown-option { display: flex; align-items: center; justify-content: space-between; gap: var(--dimension-0_75rem); padding: var(--dimension-0_65rem) var(--dimension-0_5rem); border-radius: var(--radius-0_3rem); cursor: pointer; }
	.dropdown-option.active { background: var(--accent-wash); }
	.dropdown-option[aria-selected="true"] { font-weight: var(--weight-600); }
	.compact { width: max-content; max-width: 100%; }
	.compact .dropdown-trigger { min-height: 0; padding: var(--dimension-0_25rem); border: 0; background: transparent; color: inherit; font-weight: var(--weight-600); text-decoration: underline; text-underline-offset: var(--dimension-0_14em); }
	.compact .dropdown-options { inset-inline-end: auto; min-width: var(--dimension-9rem); }
</style>
