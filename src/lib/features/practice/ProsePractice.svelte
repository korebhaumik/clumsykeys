<script lang="ts">
	import { onMount, tick, untrack } from "svelte";
	import { get } from "svelte/store";
	import ResetSvg from "../../components/icons/ResetIcon.svelte";
	import { game, practiceStats } from "../../state/app.store";
	import { modalConfig, testConfig, type TestConfig } from "../settings/settings.store";
	import { makeProsePassage } from "./prose-passage";
	import PracticeResults from "./PracticeResults.svelte";
	import { createPracticeSession, type PracticeResults as Results } from "./session";
	import { account } from "../../state/account.store";
	import { practiceBusy } from "../../state/preferences.store";
	import { startPracticeCompletion } from "./practice-completion";
	import type { PersonalBest } from "./personal-best";
	import {
		alignPracticeCaret,
		markPracticeCharacter,
		removePracticeExtra,
		type PracticeState,
	} from "./typing-dom";

	let passageConfig = get(testConfig);
	let wordsArr = $state.raw(makeProsePassage(passageConfig));

	let status = $state<PracticeState>("waiting");
	let results = $state<Results>();
	let session = $state.raw(createPracticeSession());
	let resultId = $state(window.crypto.randomUUID());
	let sessionAccountId = $state(get(account).session?.user.id ?? null);
	let completePractice: ReturnType<typeof startPracticeCompletion>;
	let personalBest = $state<Promise<PersonalBest | undefined>>();
	let typedLetter = "";
	let isBlur = $state(false);
	let caretEl = $state<HTMLDivElement>()!;
	let linesEl = $state<HTMLDivElement>()!;
	let inputEl = $state<HTMLInputElement>()!;

	let wordIndex = 0;
	let letterIndex = 0;

	export function focusInput() {
		inputEl?.focus();
	}

	onMount(() => {
		inputEl.focus();
		return () => { game.set("waiting"); practiceBusy.set(false); };
	});

	$effect(() => {
		const config = $testConfig;
		untrack(() => {
			if (config !== passageConfig) void reset(config, document.activeElement === inputEl);
		});
	});

	$effect(() => {
		game.set(status);
		practiceBusy.set(status !== "waiting");
		if (status !== "playing") return;
		practiceStats.set(untrack(() => session.stats()));
		const timer = window.setInterval(() => practiceStats.set(session.stats()), 1000);
		const deadline = passageConfig.timer === null ? undefined : window.setTimeout(finish, passageConfig.timer * 1000);
		return () => {
			window.clearInterval(timer);
			window.clearTimeout(deadline);
		};
	});

	$effect(() => {
		if (!linesEl || !caretEl) return;
		const observer = new ResizeObserver(() => {
			positionCaret(activeLetter(), letterIndex === wordsArr[wordIndex].length);
		});
		observer.observe(linesEl);
		return () => observer.disconnect();
	});

	function restart() {
		void reset(get(testConfig), true);
	}

	async function reset(config: TestConfig, focus: boolean) {
		passageConfig = config;
		wordsArr = makeProsePassage(config);
		session = createPracticeSession();
		resultId = window.crypto.randomUUID();
		sessionAccountId = get(account).session?.user.id ?? null;
		wordIndex = 0;
		letterIndex = 0;
		typedLetter = "";
		results = undefined;
		personalBest = undefined;
		status = "waiting";
		if (focus) {
			await tick();
			inputEl?.focus();
		}
	}

	function finish() {
		if (status !== "playing") return;
		results = session.finish();
		personalBest = completePractice({ id: resultId, mode: "prose", language: passageConfig.language, settings: passageConfig, stats: results });
		status = "finished";
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
			finish();
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
		if ($modalConfig.isVisible || event.isComposing || event.keyCode === 229) return;
		const { code } = event;
		if (code === "Space" || code === "Enter" || code === "Backspace") event.preventDefault();
		if (code === "Enter") {
			restart();
		} else if (code === "Backspace") {
			backspace();
		} else if (code === "Space") {
			advanceWord();
		}
	}

	function advanceWord() {
		if (wordIndex < wordsArr.length - 1 && letterIndex === wordsArr[wordIndex].length) {
			wordIndex += 1;
			letterIndex = 0;
			positionCaret(activeLetter());
		}
	}

	function enterText(text: string) {
		if ($modalConfig.isVisible) return;
		for (const letter of text.normalize("NFC")) {
			if (status === "finished") break;
			if (letter === " ") {
				advanceWord();
				continue;
			}
			if (status === "waiting") {
				sessionAccountId = get(account).session?.user.id ?? null;
				completePractice = startPracticeCompletion(sessionAccountId, { mode: "prose", language: passageConfig.language, settings: passageConfig });
			}
			status = "playing";
			typedLetter = letter;
			handleInput();
		}
	}
</script>

<section class="practice my-5">
	{#if results}
		<PracticeResults testType="Prose practice" stats={results} onRestart={restart} {resultId} {personalBest} accountId={sessionAccountId} signedIn={!!sessionAccountId} />
	{:else}
		{#key session}
			<div class="typing-frame" class:caret-idle={status === "waiting"}>
				<input tabindex="0"
					class="sr-only"
					id="boss"
					type="text"
					aria-label="Type the practice passage"
					autocomplete="off"
					autocapitalize="off"
					spellcheck={false}
					bind:this={inputEl}
					oninput={(event) => {
						if (!(event instanceof window.InputEvent) || event.isComposing) return;
						const value = event.currentTarget.value;
						event.currentTarget.value = "";
						if (event.inputType === "insertText" && Array.from(value).length === 1) enterText(value);
					}}
					oncompositionend={(event) => {
						event.currentTarget.value = "";
						enterText(event.data);
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
					<button class="typing-cover font-bold" tabindex="-1" onclick={() => inputEl.focus()}>
						Click here or Shift+Tab back to type
					</button>
				{/if}
			</div>
		{/key}
		<button
			type="button"
			tabindex="0"
			class="practice-reset mx-auto mt-5 mb-1 block rounded-sm text-dark-forest-unhighlighted focus:text-dark-forest-highlighted focus:bg-dark-forest-fade hover:bg-dark-forest-fade"
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
