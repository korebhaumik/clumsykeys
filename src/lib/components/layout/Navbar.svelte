<script lang="ts">
 import SignOutIcon from "../icons/SignOutIcon.svelte";
	import InfoSvg from "../icons/InfoIcon.svelte";
	import { theme } from "../../state/app.store";
	import { supabase } from "../../services/supabase";
	import KeyboardSvg from "../icons/KeyboardIcon.svelte";
	import CodeSvg from "../icons/CodeIcon.svelte";
	import LogoSvg from "../icons/LogoIcon.svelte";
	import HistorySvg from "../icons/HistoryIcon.svelte";
	import UserSvg from "../icons/UserIcon.svelte";
	import MenuSvg from "../icons/MenuIcon.svelte";
	import cn from "../../utils";
	import LeaderboardsSvg from "../icons/LeaderboardsIcon.svelte";
	import RocketSvg from "../icons/RocketIcon.svelte";
	import ThemeSvg from "../icons/ThemeIcon.svelte";
	import { push, router } from "svelte-spa-router";
	import LangSvg from "../icons/LangIcon.svelte";
	import { account } from "../../state/account.store";

	let { mode, active = false }: { active?: boolean; mode?: "prose" | "code" } = $props();

	async function signOut() {
		if (!supabase) return;
		await supabase.auth.signOut({ scope: "local" });
	}

	function leaveRoom() {
		const roomId = localStorage.getItem("roomId");
		localStorage.removeItem("roomId");
		localStorage.removeItem("username");
		if (roomId) {
			localStorage.removeItem(`clumsy-keys:room-session:${roomId}`);
			localStorage.removeItem(`clumsy-keys:race:${roomId}`);
		}
		void push("/");
	}

	let menuIsVisible = $state(false);
	let menuToggle: HTMLButtonElement;
	const navigationId = $props.id();

	$effect(() => {
		if (router.location) menuIsVisible = false;
	});

	function handleNavigationKey(event: KeyboardEvent) {
		if (event.key === "Escape" && menuIsVisible && !document.querySelector("dialog[open]")) {
			event.preventDefault();
			menuIsVisible = false;
			menuToggle.focus();
		}
	}

</script>

<svelte:window onkeydown={handleNavigationKey} />

<header class="flex items-end justify-between px-5 mt-5 big:px-10" class:practice-header={mode} class:active-test={active}>
	<div class="flex items-end">
		
		<div class="flex items-end w-fit brand">
			<a tabindex="0" href={mode === "code" ? "#/game" : "#/"}
				aria-label={mode === "code" ? "Clumsy Devs home" : "Clumsy Keys home"}
				class={mode ? "inline-flex h-10 w-[var(--dimension-50px)] shrink-0" : undefined}>
				<LogoSvg code={mode === "code"} />
			</a>
			
			<div class="flex flex-col items-start ml-3 font-normal font-poppins">
				<span
					class={cn(
						`text-xs sm:text-sm leading-none ml-0.5 sm:-mb-1.5 transition text-dark-forest-logo-text-subheading`,
						{
							"text-dark-forest-logo-text-subheading": $theme === "dark-forest",
							"text-classic-logo-text-subheading": $theme === "classic",
						}
					)}>cleverly clumsy</span
				>
				<span
					class={cn(
						`leading-none text-2xl sm:text-3xl transition font-medium text-dark-forest-logo-text-heading `,
						{
							"text-dark-forest-logo-text-heading": $theme === "dark-forest",
							"text-classic-logo-text-heading": $theme === "classic",
						}
					)}>{mode === "code" ? "clumsydevs" : "clumsykeys"}</span
				>
			</div>
		</div>

		
		<div
			class={cn("header-chrome hidden gap-1 md:flex", mode ? "ml-4" : "ml-7")}
			inert={active}
		>
			{#if !mode}
			<button tabindex="0"
				aria-label="Code practice"
				onclick={() => push("/game")}
				class={cn("transition p-2 text-dark-forest-accent-red ", {
					"text-dark-forest-accent-red": $theme === "dark-forest",
					"text-classic-icons-game": $theme === "classic",
				})}
			>
				<KeyboardSvg />
			</button>
			{/if}
			<a tabindex="0"
				href="#/leaderboard" aria-current={router.location === "/leaderboard" ? "page" : undefined}
				aria-label="Leaderboard"
				title="Leaderboard"
				class={cn("transition p-2 text-dark-forest-accent-purple ", {
					"text-classic-icons-game": $theme === "classic",
				})}
			>
				<LeaderboardsSvg />
			</a>
			<a tabindex="0"
				href="#/race"
				aria-label="Multiplayer"
				title="Multiplayer"
				class={cn("grid size-10 place-items-center transition text-dark-forest-accent-main", {
					"text-classic-icons-game": $theme === "classic",
				})}
			>
				<RocketSvg />
			</a>
			<button tabindex="0"
				aria-label="About"
				onclick={() => push("/about")}
				class={cn("transition p-2 text-dark-forest-accent-yellow", {
					"text-dark-forest-accent-yellow": $theme === "dark-forest",
					"text-classic-icons-game": $theme === "classic",
				})}
			>
				<InfoSvg />
			</button>
			<button tabindex="0"
				onclick={() => {
					push("/themes");
				}}
				aria-label="Settings"
				class={cn("transition p-2 rounded-sm text-dark-forest-accent-green", {
					"text-dark-forest-accent-green": $theme === "dark-forest",
					"text-classic-icons-game": $theme === "classic",
				})}
			>
				<ThemeSvg />
			</button>
		</div>
	</div>

	
	<div
		inert={active}
		class={cn(`header-chrome flex items-center text-dark-forest-credits`, {
			"text-dark-forest-credits": $theme === "dark-forest",
			"text-classic-icons-user": $theme === "classic",
		})}
	>
		{#if mode}
			<a tabindex="0" class="mode-switch" href={mode === "code" ? "#/" : "#/game"}
				aria-label={mode === "code" ? "Switch to prose practice" : "Switch to code practice"}
				title={mode === "code" ? "Switch to prose practice" : "Switch to code practice"}>
				{#if mode === "code"}<CodeSvg />{:else}<LangSvg />{/if}
			</a>
			<hr class="nav-divider hidden sm:block h-10 border-none bg-dark-forest-fade w-1 rounded-sm mx-3" />
		{:else}
			
			<button tabindex="0"
				aria-label="Language"
				class={cn("border rounded-full border-dark-forest-accent-main p-2", {
					"border-dark-forest-accent-main": $theme === "dark-forest",
					"border-black": $theme === "classic",
				})}
			>
				<LangSvg
					className={cn("rounded-full text-dark-forest-accent-main", {
						"text-dark-forest-accent-main": $theme === "dark-forest",
						"text-black": $theme === "classic",
					})}
				/>
			</button>
			<hr class="nav-divider h-10 border-none bg-dark-forest-fade w-1 rounded-sm mx-3" />
		{/if}
		
		{#if $account.session}
		<button tabindex="0"
			aria-label="Sign out"
			onclick={signOut}
			class={cn("text-dark-forest-accent-error mr-3 rounded-full p-2", mode && "hidden sm:inline-flex", {
				"text-dark-forest-accent-error": $theme === "dark-forest",
				"border border-dark-forest-accent-error": $theme === "dark-forest",
				"text-classic-icons-signout": $theme === "classic",
				"bg-classic-icons-user-bg": $theme === "classic",
			})}
			><SignOutIcon /></button
		>
		{/if}
		
		<a tabindex="0" aria-label={$account.session ? "Your account" : "Sign in or create account"} href="#/account" class="p-2 mr-2 rounded-full">
			<UserSvg />
		</a>
		
		<a tabindex="0"
			href="#/history"
			aria-current={router.location === "/history" ? "page" : undefined}
			aria-label="Your history"
			title="Your history"
			class="hidden p-2 rounded-full sm:inline-block"
		>
			<HistorySvg />
		</a>
		
		<button tabindex="0"
			bind:this={menuToggle}
			class="inline-block md:hidden"
			aria-label="Open navigation"
			aria-expanded={menuIsVisible}
			aria-controls={navigationId}
			onclick={() => {
				menuIsVisible = !menuIsVisible;
			}}
		>
			<MenuSvg />
		</button>
	</div>
	{#if menuIsVisible && !active}
		<nav id={navigationId} aria-label="Mobile navigation" class="mobile-navigation absolute right-5 top-24 z-30 grid gap-3 rounded-lg bg-dark-forest-fade p-4 text-dark-forest-highlighted md:hidden">
			<a tabindex="0" href="#/" onclick={() => (menuIsVisible = false)}>Prose practice</a>
			<a tabindex="0" href="#/game" onclick={() => (menuIsVisible = false)}>Code practice</a>
			<a tabindex="0" href="#/leaderboard" aria-current={router.location === "/leaderboard" ? "page" : undefined} onclick={() => (menuIsVisible = false)}>Leaderboard</a>
			<a tabindex="0" href="#/race" onclick={() => (menuIsVisible = false)}>Multiplayer</a>
			{#if mode}<a tabindex="0" href="#/login" onclick={() => (menuIsVisible = false)}>Join a room</a>{/if}
			<a tabindex="0" href="#/themes" onclick={() => (menuIsVisible = false)}>Settings</a>
			<a tabindex="0" href="#/about" onclick={() => (menuIsVisible = false)}>About</a>
			<a tabindex="0" href="#/account" onclick={() => (menuIsVisible = false)}>Account</a>
			<a tabindex="0" href="#/history" onclick={() => (menuIsVisible = false)}>Your history</a>
			{#if mode}<button tabindex="0" class="text-left" onclick={leaveRoom}>Leave room</button>{/if}
		</nav>
	{/if}
</header>

<style>
	.header-chrome { transition: opacity var(--motion-160ms) ease, visibility var(--motion-160ms); }
	.active-test .header-chrome { opacity: 0; visibility: hidden; }
	.brand span { transition: color var(--motion-160ms) ease; }
	.active-test .brand span { color: var(--palette-slate-600); }
	:global([data-theme="classic"]) .active-test .brand span { color: var(--palette-gray-600); }

	.mode-switch { display: grid; place-items: center; padding: var(--dimension-0_55rem); border: var(--dimension-1px) solid currentColor; border-radius: 50%; color: var(--accent); margin-right: var(--dimension-0_4rem); }
	.mode-switch:hover, .mode-switch:focus-visible { background: var(--accent-wash); }
	:global([data-theme="classic"]) .nav-divider { background: var(--line); }
	:global([data-theme="classic"]) .mobile-navigation {
		background: var(--surface);
		color: var(--ink);
		border: var(--dimension-1px) solid var(--line);
	}

	@media (max-width: 400px) {
		.practice-header :global(.font-poppins) { margin-left: var(--dimension-0_55rem); }
		.practice-header :global(.text-2xl) { font-size: var(--text-1_25rem); }
		.mode-switch { padding: var(--dimension-0_4rem); }
	}
</style>
