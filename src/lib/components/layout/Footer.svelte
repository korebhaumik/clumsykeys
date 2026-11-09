<script lang="ts">
	import type { Snippet } from "svelte";
	import DiscordSvg from "../icons/DiscordIcon.svelte";
	import DocumentSvg from "../icons/DocumentIcon.svelte";
	import DollarSvg from "../icons/DollarIcon.svelte";
	import GithubSvg from "../icons/GithubIcon.svelte";
	import LockSvg from "../icons/LockIcon.svelte";
	import MailSvg from "../icons/MailIcon.svelte";
	import ShieldSvg from "../icons/ShieldIcon.svelte";
	import { theme } from "../../state/app.store";
	import cn from "../../utils";

	let { showShortcuts = true, active = false, onRestart, onSettings, onViewRoom, trailing }: {
		showShortcuts?: boolean;
		active?: boolean;
		onRestart?: () => void;
		onSettings?: () => void;
		onViewRoom?: () => void;
		trailing?: Snippet;
	} = $props();
</script>

{#snippet command(keys: string[], label: string, action?: () => void)}
	{#snippet contents()}
		{#each keys as key, index}
			{#if index}<span class="key-join" aria-hidden="true">+</span>{/if}
			<kbd>{key}</kbd>
		{/each}
		<span class="shortcut-label">{label}</span>
	{/snippet}

	{#if action}
		<button type="button" class="footer-command" onclick={action}>{@render contents()}</button>
	{:else}
		<span class="footer-command">{@render contents()}</span>
	{/if}
{/snippet}

<div class="w-full">
	{#if showShortcuts}
		<div class="footer-shortcuts" class:active-test={active}>
			{#if onViewRoom}
				{@render command(["alt", "r"], "View room", onViewRoom)}
			{:else}
				{@render command(onRestart ? ["shift", "tab", "enter"] : ["tab", "enter"], "Restart Test", onRestart)}
				{@render command(["cmd", "k"], "Settings Menu", onSettings)}
			{/if}
			{@render trailing?.()}
		</div>
	{/if}
	
	<div
		class:active-test={active}
		inert={active}
		class={cn(
			`footer-credits flex w-full flex-wrap items-center justify-between gap-3 text-dark-forest-credits`,
			{
				"text-dark-forest-credits": $theme === "dark-forest",
				"text-classic-credits": $theme === "classic",
			}
		)}
	>
		<div class="flex w-80 max-w-full flex-wrap justify-between font-semibold md:w-[var(--dimension-40rem)]">
			<a
				aria-label="Contact"
				href="mailto:bhaumik.kore31@gmail.com"
				class="flex items-center transition cursor-pointer hover:text-classic-900"
			>
				<MailSvg />
				<span class="ml-1.5 text-xs">Contact</span>
			</a>
			<a
				aria-label="Github"
				href="http://github.com/korebhaumik/Clumsykeys"
				target="_blank"
				class="flex items-center"
			>
				<GithubSvg />
				<span class="ml-1.5 text-xs">Github</span>
			</a>
			<a
				aria-label="Discord"
				href="http://discord.gg"
				target="_blank"
				class="items-center hidden md:flex"
			>
				<DiscordSvg />
				<span class="ml-1.5 text-xs">Discord</span>
			</a>
			<div class="items-center hidden md:flex">
				<ShieldSvg />
				<span class="ml-1.5 text-xs">Security</span>
			</div>
			<div class="items-center hidden md:flex">
				<DocumentSvg />
				<span class="ml-1.5 text-xs">Terms</span>
			</div>
			<div class="items-center hidden md:flex">
				<LockSvg />
				<span class="ml-1.5 text-xs">Privacy</span>
			</div>
			<div class="flex items-center">
				<DollarSvg />
				<span class="ml-1.5 text-xs">Support</span>
			</div>
		</div>
		<p class="hidden text-xs big:block">
			developed by <a
				aria-label="Kore Bhaumik"
				class="text-amber-700 hover:underline"
				href="http://github.com/korebhaumik"
				target="_blank">@korebhaumik</a
			>
		</p>
	</div>
</div>

<style>
	.footer-credits { transition: opacity var(--motion-160ms) ease, visibility var(--motion-160ms); }
	.footer-credits.active-test { opacity: 0; visibility: hidden; }
	.footer-shortcuts { --key-bg: var(--palette-stone-500); --key-ink: var(--palette-forest-950); display: flex; flex-wrap: wrap; gap: var(--dimension-0_65rem) var(--dimension-2_5rem); margin-bottom: var(--dimension-1_25rem); color: var(--key-bg); font-size: var(--text-0_875rem); line-height: var(--dimension-1_25rem); }
	.footer-shortcuts.active-test { --key-bg: var(--palette-slate-600); }
	:global([data-theme="classic"]) .footer-shortcuts { --key-bg: var(--palette-black); --key-ink: var(--palette-white); }
	:global([data-theme="classic"]) .footer-shortcuts.active-test { --key-bg: var(--palette-gray-600); }
	.footer-command { display: inline-flex; align-items: center; gap: var(--dimension-0_25rem); }
	.footer-command kbd { border: 0; border-radius: var(--radius-0_25rem); padding: var(--dimension-0_25rem) var(--dimension-0_75rem); background: var(--key-bg); color: var(--key-ink); font: inherit; }
	.key-join { font-size: var(--text-1_125rem); }
	.shortcut-label { margin-inline-start: var(--dimension-0_5rem); }
	button.footer-command:hover .shortcut-label { color: var(--accent); }
</style>
