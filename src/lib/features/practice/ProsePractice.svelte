<script lang="ts">
	import { onMount, tick, untrack } from "svelte";
	import ResetSvg from "../../components/icons/ResetIcon.svelte";
	import { game, practiceStats } from "../../state/app.store";
	import { modalConfig } from "../settings/settings.store";
	import PracticeResults from "./PracticeResults.svelte";
	import { createPracticeSession, type PracticeResults as Results } from "./session";
	import {
		alignPracticeCaret,
		markPracticeCharacter,
		removePracticeExtra,
		type PracticeState,
	} from "./typing-dom";

	const wordsArr = "The quick brown fox jumps over the lazy dog.".split(" ");

	let status = $state<PracticeState>("waiting");
	let results = $state<Results>();
	let session = $state.raw(createPracticeSession());
	let typedLetter = "";
	let isBlur = $state(false);
	let caretEl = $state<HTMLDivElement>()!;
	let linesEl = $state<HTMLDivElement>()!;
	let resetEl = $state<HTMLButtonElement>()!;
	let inputEl = $state<HTMLInputElement>()!;

	let wordIndex = 0;
	let letterIndex = 0;

	onMount(() => {
		inputEl.focus();
		return () => game.set("waiting");
	});

	$effect(() => {
		game.set(status);
		if (status !== "playing") return;
		practiceStats.set(untrack(() => session.stats()));
		const timer = window.setInterval(() => practiceStats.set(session.stats()), 1000);
		return () => window.clearInterval(timer);
	});

	function handleTab(event: KeyboardEvent) {
		if (event.key !== "Tab" || event.shiftKey || results || $modalConfig.isVisible) return;
		if (document.activeElement !== inputEl && document.activeElement !== resetEl) return;
		event.preventDefault();
		(document.activeElement === inputEl ? resetEl : inputEl).focus();
	}

	$effect(() => {
		if (!linesEl || !caretEl) return;
		const observer = new ResizeObserver(() => {
			positionCaret(activeLetter(), letterIndex === wordsArr[wordIndex].length);
		});
		observer.observe(linesEl);
		return () => observer.disconnect();
	});

	async function restart() {
		session = createPracticeSession();
		wordIndex = 0;
		letterIndex = 0;
		typedLetter = "";
		results = undefined;
		status = "waiting";
		await tick();
		inputEl.focus();
	}

	function positionCaret(target: HTMLElement, afterTarget = false) {
		caretEl.style.left = `${target.offsetLeft + (afterTarget ? target.offsetWidth : 0)}px`;
		alignPracticeCaret(caretEl, linesEl, target, target.parentElement!);
	}

	function activeLetter() {
		const word = linesEl.children[wordIndex];
		return word.children[Math.min(letterIndex, word.children.length - 1)] as HTMLElement;
	}

	function handleInput() {
		if (status !== "playing") return;
		const word = wordsArr[wordIndex];
		const extra = letterIndex === word.length;
		const target = activeLetter();
		const correct = markPracticeCharacter(target, typedLetter, extra);
		session.record(extra ? "extra" : correct ? "correct" : "incorrect", word, String(wordIndex), letterIndex);

		if (!extra) letterIndex += 1;
		typedLetter = "";
		positionCaret(target, true);

		if (correct && wordIndex === wordsArr.length - 1 && letterIndex === word.length) {
			results = session.finish();
			status = "finished";
		}
	}

	function backspace() {
		if (letterIndex === 0) {
			if (wordIndex === 0) return;
			wordIndex -= 1;
			letterIndex = wordsArr[wordIndex].length;
			positionCaret(activeLetter(), true);
			return;
		}

		const wordComplete = letterIndex === wordsArr[wordIndex].length;
		if (wordComplete && removePracticeExtra(activeLetter())) {
			positionCaret(activeLetter(), true);
			return;
		}

		letterIndex -= 1;
		const target = activeLetter();
		target.firstElementChild!.className = "text-zinc-600";
		positionCaret(target);
	}

	function handleKeydown(event: KeyboardEvent) {
		const { code } = event;
		if (code === "Space" || code === "Enter" || code === "Backspace") event.preventDefault();
		if (event.key.length !== 1 && code !== "Backspace" && code !== "Enter") return;
		if (status === "waiting") status = "playing";
		if (status !== "playing") return;

		if (code === "Enter") {
			void restart();
		} else if (code === "Backspace") {
			backspace();
		} else if (
			code === "Space" &&
			wordIndex < wordsArr.length - 1 &&
			letterIndex === wordsArr[wordIndex].length
		) {
			wordIndex += 1;
			letterIndex = 0;
			positionCaret(activeLetter());
		}
	}
</script>

<svelte:window onkeydown={handleTab} />

<section class="practice my-5">
	{#if results}
		<PracticeResults testType="Prose practice" stats={results} onRestart={restart} />
	{:else}
		{#key session}
			<div class="typing-frame">
				<input
					class="sr-only"
					id="boss"
					type="text"
					aria-label="Type the practice passage"
					autocomplete="off"
					autocapitalize="off"
					spellcheck={false}
					bind:this={inputEl}
					oninput={(event) => {
						typedLetter = event.currentTarget.value;
						if (typedLetter.length === 1) handleInput();
						event.currentTarget.value = "";
					}}
					onkeydown={handleKeydown}
					onblur={() => (isBlur = true)}
					onfocus={() => (isBlur = false)}
				/>
				<div bind:this={linesEl} class="typing-window">
					{#each wordsArr as word, index}
						<span class="typing-word">
							{#each word as letter}
								<span class="text-zinc-600"><span class="text-inherit">{letter}</span></span>
							{/each}
						</span>{#if index < wordsArr.length - 1}{" "}{/if}
					{/each}
				</div>
				<div bind:this={caretEl} class="typing-caret bg-blue-300" aria-hidden="true"></div>
				{#if isBlur}
					<button class="typing-cover font-bold" onclick={() => inputEl.focus()}>
						Click Here or click "Tab" to Focus
					</button>
				{/if}
			</div>
		{/key}
		<button
			bind:this={resetEl}
			class="practice-reset mx-auto my-1 block rounded-sm outline-hidden text-dark-forest-unhighlighted focus:text-dark-forest-highlighted focus:bg-dark-forest-fade hover:bg-dark-forest-fade"
			aria-label="reset"
			onclick={restart}
		>
			<ResetSvg />
		</button>
	{/if}
</section>

<style>
	:global([data-theme="classic"]) .practice-reset { color: var(--ink); }
	:global([data-theme="classic"]) .practice-reset:is(:hover, :focus) { background: var(--accent-wash); }
</style>
