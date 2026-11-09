<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SVGAttributes } from "svelte/elements";
    let { children, ...attributes }: SVGAttributes<SVGSVGElement> & { children?: Snippet } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" {...attributes}>
    {@render children?.()}
</svg>
