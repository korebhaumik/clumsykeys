<script lang="ts">
	let { onClose, onBack }: { onClose: () => void; onBack?: () => void } = $props();
</script>

<footer class="settings-dialog-footer" role="group" aria-label="Settings shortcuts">
	<button class="settings-shortcut" type="button" aria-keyshortcuts="Escape" onclick={onBack ?? onClose}>
		<kbd aria-hidden="true">Esc</kbd>
		<span>{onBack ? "Back" : "Close"}</span>
	</button>
	<span class="settings-shortcut">
		<span class="settings-shortcut-keys" aria-label="Control or Command plus K">
			<kbd>Ctrl</kbd><span aria-hidden="true">/</span><kbd>⌘</kbd><span aria-hidden="true">+</span><kbd>K</kbd>
		</span>
		<span>Settings</span>
	</span>
</footer>
