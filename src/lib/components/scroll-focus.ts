/** Keep static regions out of the tab order unless keyboard scrolling is needed. */
export function scrollFocus(node: HTMLElement) {
	const update = () => {
		node.tabIndex = node.scrollWidth > node.clientWidth ? 0 : -1;
	};
	const resize = new ResizeObserver(update);
	const observeContent = () => {
		resize.disconnect();
		resize.observe(node);
		for (const child of node.children) resize.observe(child);
		update();
	};
	const content = new window.MutationObserver(observeContent);
	content.observe(node, { childList: true, subtree: true, characterData: true });
	observeContent();
	return {
		destroy() {
			resize.disconnect();
			content.disconnect();
		},
	};
}
