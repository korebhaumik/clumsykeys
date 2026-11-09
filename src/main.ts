import { mount } from "svelte";
import "./styles/app.css";
import "./styles/engine.css";
import "./styles/results.css";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Missing app mount point");

mount(App, { target, intro: false });
