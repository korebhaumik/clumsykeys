<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import CrossIcon from "../../components/icons/CrossIcon.svelte";
	import SettingsShortcuts from "./SettingsShortcuts.svelte";

	let { open, title, icon: Icon, onClose, onBack, onFocusFallback, children }: {
		open: boolean;
		title: string;
		icon: Component<Record<string, never>>;
		onClose: () => void;
		onBack?: () => void;
		onFocusFallback: () => void;
		children: Snippet;
	} = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let heading = $state<HTMLHeadingElement>();
	let opener: Element | null = null;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			opener = document.activeElement;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	$effect(() => {
		// Moving to another settings page announces its heading to keyboard users.
		if (open && title) heading?.focus();
	});

	function handleClose() {
		if (dialog?.open) return;
		onClose();
		if (!opener?.isConnected || document.activeElement === document.body || dialog?.contains(document.activeElement)) {
			onFocusFallback();
		}
	}
</script>

<dialog class="settings-dialog" bind:this={dialog} aria-labelledby={`${id}-title`}
	oncancel={(event) => { event.preventDefault(); (onBack ?? onClose)(); }}
	onclose={handleClose}
	onpointerdown={(event) => { if (event.target === dialog) onClose(); }}
>
	<header class="settings-dialog-header">
		{#key title}
			<h2 id={`${id}-title`} tabindex="-1" bind:this={heading}><Icon /> {title}</h2>
		{/key}
		<button tabindex="0" class="settings-dialog-close button button-secondary" type="button" aria-label="Close settings" onclick={onClose}><CrossIcon /></button>
	</header>
	<div class="settings-dialog-body">{@render children()}</div>
	<SettingsShortcuts {onClose} {onBack} />
</dialog>
