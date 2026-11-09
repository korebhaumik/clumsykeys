<script lang="ts">
 import IndentIcon from "../../components/icons/IndentIcon.svelte";
	import { onMount, tick } from "svelte";
	import PracticeLayout from "../../components/layout/PracticeLayout.svelte";
	import CodeOptions from "./CodeOptions.svelte";
	import ResetSvg from "../../components/icons/ResetIcon.svelte";
	import TestSettingsButton from "../settings/TestSettingsButton.svelte";
	import PracticeLiveStats from "./PracticeLiveStats.svelte";
	import PracticeResults from "./PracticeResults.svelte";
	import { createPracticeSession, type PracticeResults as Results, type PracticeStats } from "./session";
	import { langData, languages, parseSnippet } from "./code-snippets";
	import {
		alignPracticeCaret,
		markPracticeCharacter,
		removePracticeExtra,
		type PracticeState,
	} from "./typing-dom";


	let langChoice = $state("randomPy" as keyof typeof langData);

	let snippetIndex = $state(Math.floor(Math.random() * langData.randomPy.length));
	let codeSnippet = $derived(parseSnippet(langData[langChoice][snippetIndex]));

	let game = $state<PracticeState>("waiting");
	let liveStats = $state<PracticeStats>();
	let results = $state<Results>();
	let session = $state.raw(createPracticeSession());
	let typedLetter = "";
	let isBlur = $state(false);
	let autoTabs = $state(true);
	let lineIndex = $state(0);
	let wordIndex = 0;
	let letterIndex = 0;
	let tabHeld = false;

	let caretEl = $state<HTMLDivElement>()!;
	let linesEl = $state<HTMLDivElement>()!;
	let codeScrollEl = $state<HTMLDivElement>()!;
	let settingsDialog = $state<HTMLDialogElement>()!;
	let inputEl = $state<HTMLInputElement>()!;
	let focusPrompt = $state<HTMLButtonElement>();

	let wordPositions: number[][] = [];
	let tabPositions: number[] = [];

	function resetPositions() {
		wordPositions = codeSnippet.map(({ content }) => content.map(() => 0));
		tabPositions = codeSnippet.map(() => 0);
	}

	onMount(() => {
		resetPositions();
		inputEl.focus();
	});

	$effect(() => {
		if (game !== "playing") return;
		const activeSession = session;
		liveStats = activeSession.stats();
		const timer = window.setInterval(() => (liveStats = activeSession.stats()), 1000);
		return () => window.clearInterval(timer);
	});

	function activeRow() {
		return linesEl.children[lineIndex] as HTMLElement;
	}

	function activeWord() {
		return activeRow().lastElementChild!.children[wordIndex] as HTMLElement;
	}

	function activeLetter(word: HTMLElement) {
		return word.children[Math.min(letterIndex, word.children.length - 1)] as HTMLElement | undefined;
	}

	function needsIndent() {
		return !autoTabs && wordIndex === 0 && letterIndex === 0 &&
			tabPositions[lineIndex] < codeSnippet[lineIndex].indents;
	}

	async function restart() {
		session = createPracticeSession();
		wordIndex = 0;
		letterIndex = 0;
		lineIndex = 0;
		resetPositions();
		typedLetter = "";
		results = undefined;
		game = "waiting";
		await tick();
		inputEl.focus();
	}

	function selectLanguage(event: Event) {
		const language = (event.currentTarget as HTMLSelectElement).value as keyof typeof langData;
		langChoice = language;
		snippetIndex = Math.floor(Math.random() * langData[language].length);
		void restart();
	}

	function nextSnippet() {
		snippetIndex = (snippetIndex + 1) % langData[langChoice].length;
		void restart();
	}

	function openSettings() {
		if (!settingsDialog.open) settingsDialog.showModal();
	}

	function handleShortcut(event: KeyboardEvent) {
		if (event.key === "Tab") {
			tabHeld = true;
			const focused = document.activeElement;
			if (isBlur && !results && !settingsDialog.open &&
				!event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey &&
				(focused === document.body || focused === focusPrompt)) {
				event.preventDefault();
				inputEl.focus();
			}
		}

		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			if (settingsDialog.open) settingsDialog.close();
			else openSettings();
		} else if (
			event.key === "Enter" && event.shiftKey && tabHeld &&
			!event.metaKey && !event.ctrlKey && !event.altKey && !settingsDialog.open
		) {
			event.preventDefault();
			event.stopPropagation();
			if (!event.repeat) void restart();
		}
	}

	function releaseTab(event: KeyboardEvent) {
		if (event.key === "Tab") tabHeld = false;
	}

	function positionCaret(target: Element, afterTarget = false) {
		const frame = caretEl.parentElement!.getBoundingClientRect();
		const bounds = target.getBoundingClientRect();
		const x = (afterTarget ? bounds.right : bounds.left) - frame.left;
		caretEl.style.left = `${x}px`;
		alignPracticeCaret(caretEl, linesEl, activeRow());

		const viewport = codeScrollEl.getBoundingClientRect();
		const inset = 18;
		const caretX = frame.left + x;
		if (caretX < viewport.left + inset) {
			codeScrollEl.scrollLeft += caretX - viewport.left - inset;
		} else if (caretX > viewport.right - inset) {
			codeScrollEl.scrollLeft += caretX - viewport.right + inset;
		}
	}

	function positionAtStart() {
		if (needsIndent()) {
			positionCaret(activeRow().children[tabPositions[lineIndex]]);
		} else {
			positionCaret(activeWord());
		}
	}

	function enterIndent() {
		const marker = activeRow().children[tabPositions[lineIndex]] as SVGElement;
		const correct = typedLetter === "\t";
		marker.style.color = correct ? "var(--indent-correct)" : "var(--indent-incorrect)";
		session.record(correct ? "correct" : "incorrect", "↹".repeat(codeSnippet[lineIndex].indents), `${lineIndex}:indent`, tabPositions[lineIndex]);
		tabPositions[lineIndex] += 1;
		typedLetter = "";
		positionAtStart();
	}

	function handleInput() {
		if (game !== "playing") return;
		if (needsIndent()) {
			enterIndent();
			return;
		}

		const word = activeWord();
		const target = activeLetter(word);
		const extra = letterIndex === word.children.length;
		const correct = target && markPracticeCharacter(target, typedLetter, extra);
		session.record(extra ? "extra" : correct ? "correct" : "incorrect", codeSnippet[lineIndex].content[wordIndex], `${lineIndex}:${wordIndex}`, letterIndex);
		if (!extra) letterIndex += 1;
		typedLetter = "";
		positionCaret(target ?? word, true);

		if (lineIndex === codeSnippet.length - 1 &&
			wordIndex === codeSnippet[lineIndex].content.length - 1 &&
			letterIndex === word.children.length) {
			results = session.finish();
			game = "finished";
		}
	}

	function saveWord() {
		wordPositions[lineIndex][wordIndex] = letterIndex;
		const word = activeWord();
		if (letterIndex === word.children.length) return;
		for (const letter of word.children) {
			letter.firstElementChild!.className += " decoration-red-500 underline";
		}
	}

	function restoreWord() {
		letterIndex = wordPositions[lineIndex][wordIndex];
		const word = activeWord();
		for (const letter of word.children) {
			const feedback = letter.firstElementChild!;
			feedback.className = feedback.className.replace(" decoration-red-500 underline", "");
		}
		const atWordEnd = letterIndex === word.children.length;
		positionCaret(activeLetter(word) ?? word, atWordEnd);
	}

	function backspace() {
		const word = activeWord();
		if (letterIndex > 0) {
			const target = activeLetter(word)!;
			if (letterIndex === word.children.length && removePracticeExtra(target)) {
				positionCaret(target, true);
			} else {
				letterIndex -= 1;
				const previous = activeLetter(word)!;
				previous.firstElementChild!.className = "text-zinc-600";
				positionCaret(previous);
			}
		} else if (wordIndex > 0) {
			wordIndex -= 1;
			restoreWord();
		} else if (!autoTabs && tabPositions[lineIndex] > 0) {
			tabPositions[lineIndex] -= 1;
			const marker = activeRow().children[tabPositions[lineIndex]] as SVGElement;
			marker.style.removeProperty("color");
			positionAtStart();
		} else if (lineIndex > 0) {
			lineIndex -= 1;
			wordIndex = codeSnippet[lineIndex].content.length - 1;
			restoreWord();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const { code } = event;
		if (code === "Tab" && event.shiftKey) return;
		if (code === "Space" || code === "Enter" || code === "Tab" || code === "Backspace") event.preventDefault();
		if (event.key.length !== 1 && !["Enter", "Tab", "Backspace"].includes(code)) return;
		if (game === "waiting") game = "playing";
		if (game !== "playing") return;

		const lastWordInLine = wordIndex === codeSnippet[lineIndex].content.length - 1;
		switch (code) {
			case "Tab":
				typedLetter = "\t";
				handleInput();
				break;
			case "Space":
				if (needsIndent()) {
					enterIndent();
				} else if (!lastWordInLine && (letterIndex > 0 || activeWord().children.length === 0)) {
					saveWord();
					wordIndex += 1;
					letterIndex = 0;
					positionAtStart();
				}
				break;
			case "Enter":
				if (lastWordInLine && letterIndex > 0 && lineIndex < codeSnippet.length - 1) {
					saveWord();
					lineIndex += 1;
					wordIndex = 0;
					letterIndex = 0;
					codeScrollEl.scrollLeft = 0;
					positionAtStart();
				}
				break;
			case "Backspace":
				backspace();
				break;
		}
	}
</script>

<svelte:window onkeydowncapture={handleShortcut} onkeyup={releaseTab} onblur={() => { tabHeld = false; }} />



<PracticeLayout mode="code" active={game === "playing"} finished={!!results} onRestart={restart} onSettings={openSettings}>

	{#if results}
		<PracticeResults testType={`${languages[langChoice]} practice`} stats={results} onRestart={restart} />
	{:else}
	<div class="code-layout" class:playing={game === "playing"}>
		<div class="code-toolbar">
			<div class="toolbar-row">
				<TestSettingsButton onclick={openSettings} />
				{#if game === "waiting"}
					<div class="snippet-selector">
						<span>Snippets</span>
						<span>{snippetIndex + 1} / {langData[langChoice].length}</span>
						<button type="button" onclick={nextSnippet}>Next snippet <span aria-hidden="true">→</span></button>
					</div>
				{/if}
			</div>
			{#if game === "waiting"}<CodeOptions bind:autoTabs {langChoice} onLanguageChange={selectLanguage} />{/if}
		</div>
		{#if game === "playing"}<PracticeLiveStats stats={liveStats} />{/if}

		{#key session}
		<section class="code-passage" aria-label={`${languages[langChoice]} snippet`}>
			<div bind:this={codeScrollEl} class="code-scroll">
				<div class="typing-frame code-frame">
					<input
						class="sr-only"
						id="boss"
						type="text"
						aria-label="Type the practice snippet"
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
						onblur={() => { isBlur = true; }}
						onfocus={() => { isBlur = false; }}
					/>
					<div bind:this={linesEl} class="typing-window">
						{#each codeSnippet as line}
							<div class="code-line">
								{#each Array.from({ length: line.indents }, (_, index) => index) as indentIndex (indentIndex)}
									<IndentIcon className="h-6 w-6 self-start mr-2 ml-1 mt-1 {autoTabs && line.index <= lineIndex ? 'text-zinc-500' : 'text-zinc-800'}" />
								{/each}
								<p class="code-line-text">
									{#each line.content as word}
										<span>
											{#each word as letter}
												<span class="text-zinc-600"><span class="text-inherit">{letter}</span></span>
											{/each}
										</span>
									{/each}
								</p>
							</div>
						{/each}
					</div>
					<div bind:this={caretEl} class="typing-caret bg-blue-300" aria-hidden="true"></div>
				</div>
			</div>
			{#if isBlur && game !== "finished"}
				<button type="button" class="typing-cover font-bold" bind:this={focusPrompt} onclick={() => inputEl.focus()}>
					Click here or press Tab to focus
				</button>
			{/if}
		</section>
		{/key}
		<button type="button" class="code-reset" aria-label="Reset code practice" title="Reset code practice" onclick={restart}><ResetSvg /></button>
	</div>
	{/if}

	<dialog class="code-settings" bind:this={settingsDialog} aria-labelledby="code-settings-title" onclose={() => { if (!results) inputEl.focus(); }}>
		<div class="settings-heading">
			<h2 id="code-settings-title">Test Settings</h2>
			<form method="dialog"><button type="submit">Close</button></form>
		</div>
		<CodeOptions bind:autoTabs {langChoice} onLanguageChange={selectLanguage} />
	</dialog>
</PracticeLayout>

<style>
	.code-layout { display: grid; grid-template-columns: minmax(0, 1fr); }
	.code-frame { --indent-correct: var(--palette-zinc-400); --indent-incorrect: var(--palette-red-500); }
	:global([data-theme="classic"]) .code-frame {
		--typing-muted: var(--muted);
		--indent-correct: var(--ink);
		--indent-incorrect: var(--error);
	}
	:global([data-theme="classic"]) .code-frame :global(.text-zinc-500) { color: var(--ink); }
	.code-toolbar { display: grid; justify-items: start; gap: var(--dimension-0_75rem); margin-bottom: var(--dimension-1_55rem); }
	.playing .code-toolbar { margin-bottom: 0; }
	.playing .code-passage { margin-top: var(--dimension-1_25rem); }

    .toolbar-row, .snippet-selector { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-0_75rem); }
    .toolbar-row { align-items: stretch; }
    .snippet-selector { min-height: var(--dimension-3rem); padding: 0 var(--dimension-1rem); border-radius: var(--radius-0_5rem); font-weight: var(--weight-600); background: var(--surface); color: var(--muted); }
    .snippet-selector button { color: var(--accent); }
    :global([data-theme="classic"]) .snippet-selector { background: var(--accent); color: color-mix(in srgb, var(--accent-ink) 60%, var(--accent)); color-scheme: dark; }
    :global([data-theme="classic"]) .snippet-selector button { color: var(--accent-ink); }
    :global([data-theme="classic"]) .snippet-selector button:focus-visible { outline-color: var(--accent-ink); }

	.code-scroll { position: relative; overflow-x: auto; scrollbar-color: var(--line) var(--inset); }
	.code-frame { width: max-content; min-width: 100%; font-family: inherit; }
	.code-line { display: flex; align-items: center; min-height: var(--practice-line-height); }
	.code-line-text { white-space: nowrap; }
	.code-line-text > span + span { margin-inline-start: var(--dimension-1ch); }
	.code-passage { position: relative; }
	.code-passage .typing-cover { background: transparent; }
	.code-reset { justify-self: center; margin-top: var(--dimension-1_25rem); color: var(--muted); }
	.code-reset:hover { color: var(--accent); }
	:global([data-theme="classic"]) .code-reset { color: var(--ink); }
	:global([data-theme="classic"]) .code-reset:is(:hover, :focus-visible) { background: var(--accent-wash); }
	.code-settings { margin: auto; max-width: min(100% - var(--dimension-2rem), var(--dimension-32rem)); padding: var(--dimension-1rem); border: var(--dimension-1px) solid var(--line); border-radius: var(--radius-0_75rem); background: var(--inset); color: var(--ink); }
	.code-settings::backdrop { background: var(--overlay-dialog); backdrop-filter: blur(var(--dimension-3px)); }
	.settings-heading { display: flex; justify-content: space-between; gap: var(--dimension-1rem); margin-bottom: var(--dimension-0_8rem); color: var(--accent); }
</style>
