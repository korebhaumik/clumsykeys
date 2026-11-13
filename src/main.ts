import { mount } from "svelte";
import "./styles/engine.css";
import "./styles/results.css";
import { initializeAccount } from "./lib/state/account.store";

const target = document.getElementById("app");
if (!target) throw new Error("Missing app mount point");

// Process PKCE query parameters before the hash router reads its initial route.
void initializeAccount().then(async cleanup => {
	const { default: App } = await import("./App.svelte");
	const instance = mount(App, { target, intro: false });
	if (import.meta.hot) import.meta.hot.dispose(() => { cleanup(); void import("svelte").then(({ unmount }) => unmount(instance)); });
});
