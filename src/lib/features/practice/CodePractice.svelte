<script lang="ts">
 import IndentIcon from "../../components/icons/IndentIcon.svelte";
	import { onMount, tick } from "svelte";
	import { get } from "svelte/store";
	import PracticeLayout from "../../components/layout/PracticeLayout.svelte";
	import CodeOptions from "./CodeOptions.svelte";
	import ResetSvg from "../../components/icons/ResetIcon.svelte";
	import CodeSvg from "../../components/icons/CodeIcon.svelte";
	import TestSettingsButton from "../settings/TestSettingsButton.svelte";
	import CodeSettingsModal from "./CodeSettingsModal.svelte";
	import PracticeLiveStats from "./PracticeLiveStats.svelte";
	import PracticeResults from "./PracticeResults.svelte";
	import { createPracticeSession, type PracticeResults as Results, type PracticeStats } from "./session";
	import { langData, languages, parseSnippet } from "./code-snippets";
	import { drawCodeKeywords, type KeywordLimit, type KeywordModifiers } from "./code-keywords";
	import { codePreferencesKey, codePreferences } from "./code-preferences";
	import { account } from "../../state/account.store";
	import { practiceBusy } from "../../state/preferences.store";
	import { submitPracticeResult } from "./result-persistence";
	import {
		alignPracticeCaret,
		markPracticeCharacter,
		removePracticeExtra,
		type PracticeState,
	} from "./typing-dom";


	const preferences = get(codePreferences);
	let langChoice = $state(preferences.language);

	let mode = $state(preferences.mode);
	let keywordLimit = $state(preferences.limit);
	let modifiers = $state(preferences.modifiers);
	let keywords = $state.raw(preferences.mode === "keywords"
		? drawCodeKeywords(preferences.language, keywordCount(preferences.limit), preferences.modifiers)
		: []);
	let snippetIndex = $state(Math.floor(Math.random() * langData[preferences.language].length));
	let codeSnippet = $derived(mode === "keywords"
		? [{ content: keywords, indents: 0, index: 0 }]
		: parseSnippet(langData[langChoice][snippetIndex]));

	let game = $state<PracticeState>("waiting");
	let liveStats = $state<PracticeStats>();
	let results = $state<Results>();
	let session = $state.raw(createPracticeSession());
	let resultId = $state(window.crypto.randomUUID());
	let sessionAccountId = $state(get(account).session?.user.id ?? null);
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
	let settingsOpen = $state(false);
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
		const unsubscribe = codePreferences.subscribe(next => {
			if (game !== "waiting" || JSON.stringify(next) === JSON.stringify({ mode, language: langChoice, limit: keywordLimit, modifiers })) return;
			langChoice = next.language; mode = next.mode; keywordLimit = next.limit; modifiers = { ...next.modifiers };
			snippetIndex = Math.floor(Math.random() * langData[next.language].length);
			void restart();
		});
		return () => { unsubscribe(); practiceBusy.set(false); };
	});

	$effect(() => {
		const settings = JSON.stringify({ mode, language: langChoice, limit: keywordLimit, modifiers });
		if (JSON.stringify(get(codePreferences)) !== settings) codePreferences.set(JSON.parse(settings));
		try {
			sessionStorage.setItem(codePreferencesKey, settings);
		} catch {
			// Keep the current controls usable when storage is unavailable.
		}
	});

	$effect(() => {
		practiceBusy.set(game !== "waiting");
		if (game !== "playing") return;
		const activeSession = session;
		liveStats = activeSession.stats();
		const timer = window.setInterval(() => (liveStats = activeSession.stats()), 1000);
		const deadline = mode === "keywords" && keywordLimit.type === "time"
			? window.setTimeout(finish, keywordLimit.value * 1000)
			: undefined;
		return () => {
			window.clearInterval(timer);
			window.clearTimeout(deadline);
		};
	});

	$effect(() => {
		if (mode !== "keywords" || !linesEl || !caretEl) return;
		const observer = new ResizeObserver(() => {
			const word = activeWord();
			positionCaret(activeLetter(word) ?? word, letterIndex === word.children.length);
		});
		observer.observe(linesEl);
		return () => observer.disconnect();
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
		if (mode === "keywords") {
			keywords = drawCodeKeywords(langChoice, keywordCount(keywordLimit), modifiers);
		}
		session = createPracticeSession();
		resultId = window.crypto.randomUUID();
		sessionAccountId = get(account).session?.user.id ?? null;
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

	function keywordCount(limit: KeywordLimit) {
		return limit.type === "time" ? limit.value * 5 : limit.value;
	}

	function selectMode(next: typeof mode) {
		if (mode === next) return;
		mode = next;
		void restart();
	}

	function selectLimit(limit: KeywordLimit) {
		if (limit.type === keywordLimit.type && limit.value === keywordLimit.value) return;
		keywordLimit = limit;
		void restart();
	}

	function toggleModifier(modifier: keyof KeywordModifiers) {
		modifiers[modifier] = !modifiers[modifier];
		void restart();
	}

	function finish() {
		if (game !== "playing") return;
		results = session.finish();
		submitPracticeResult(sessionAccountId, { id: resultId, mode: mode === "keywords" ? "code-keywords" : "code-snippets",
			language: langChoice, settings: { mode, language: langChoice, limit: keywordLimit, modifiers: { ...modifiers }, autoTabs }, stats: results });
		game = "finished";
	}

	function startSession() {
		if (game !== "waiting") return;
		sessionAccountId = get(account).session?.user.id ?? null;
		game = "playing";
	}

	function selectLanguage(language: keyof typeof langData) {
		langChoice = language;
		snippetIndex = Math.floor(Math.random() * langData[language].length);
		void restart();
	}

	function nextSnippet() {
		snippetIndex = (snippetIndex + 1) % langData[langChoice].length;
		void restart();
	}

	function openSettings() {
		settingsOpen = true;
	}

	function handleShortcut(event: KeyboardEvent) {
		if (event.key === "Tab") {
			tabHeld = true;
			const focused = document.activeElement;
			if (isBlur && !results && !settingsOpen &&
				!event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey &&
				(focused === document.body || focused === focusPrompt)) {
				event.preventDefault();
				inputEl.focus();
			}
		}

		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			if (settingsOpen) settingsOpen = false;
			else openSettings();
		} else if (
			event.key === "Enter" && event.shiftKey && tabHeld &&
			!event.metaKey && !event.ctrlKey && !event.altKey && !settingsOpen
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
		if (mode === "keywords") {
			alignPracticeCaret(caretEl, linesEl, target, activeWord());
			return;
		}
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

		if ((mode === "snippets" || correct) && lineIndex === codeSnippet.length - 1 &&
			wordIndex === codeSnippet[lineIndex].content.length - 1 &&
			letterIndex === word.children.length) {
			finish();
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

	function advanceWord() {
		if (wordIndex === codeSnippet[lineIndex].content.length - 1) return;
		const length = activeWord().children.length;
		if (mode === "keywords" ? letterIndex < length : letterIndex === 0 && length > 0) return;
		saveWord();
		wordIndex += 1;
		letterIndex = 0;
		positionAtStart();
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
		if (mode === "keywords" && code === "Tab") return;
		if (code === "Tab" && event.shiftKey) return;
		if (code === "Space" || code === "Enter" || code === "Tab" || code === "Backspace") event.preventDefault();
		if (event.key.length !== 1 && !["Enter", "Tab", "Backspace"].includes(code)) return;
		if (mode === "snippets") startSession();
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
				} else {
					advanceWord();
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

{#snippet modeToggle()}
	<div class="mode-toggle" role="group" aria-label="Practice mode">
		<button type="button" aria-pressed={mode === "snippets"} onclick={() => selectMode("snippets")}><CodeSvg /> Snippets</button>
		<button type="button" aria-pressed={mode === "keywords"} onclick={() => selectMode("keywords")}><span aria-hidden="true">Aa</span> Keywords</button>
	</div>
{/snippet}

{#snippet codeOptions(section: "test" | "details")}
	<CodeOptions bind:autoTabs {langChoice} {mode} {section} {keywordLimit} {modifiers} onLimitChange={selectLimit} onToggleModifier={toggleModifier} onLanguageChange={selectLanguage} />
{/snippet}

<PracticeLayout mode="code" active={game === "playing"} finished={!!results} onRestart={restart} onSettings={openSettings}>

	{#if results}
		<PracticeResults testType={`${languages[langChoice]} ${mode === "keywords" ? "keywords" : "practice"}`} stats={results} onRestart={restart} {resultId} signedIn={!!sessionAccountId} />
	{:else}
	<div class="code-layout" class:playing={game === "playing"}>
		<div class="code-toolbar">
			<div class="toolbar-row">
				<TestSettingsButton disabled={game === "playing"} onclick={openSettings} />
				{#if game === "waiting"}{@render modeToggle()}{/if}
				{#if game === "waiting" && mode === "snippets"}
					<div class="snippet-selector">
						<span>Snippets</span>
						<span>{snippetIndex + 1} / {langData[langChoice].length}</span>
						<button type="button" onclick={nextSnippet}>Next snippet <span aria-hidden="true">→</span></button>
					</div>
				{:else if game === "waiting"}
					{@render codeOptions("test")}
				{/if}
			</div>
			{#if game === "waiting"}{@render codeOptions("details")}{/if}
		</div>
		{#if game === "playing"}<PracticeLiveStats stats={liveStats} />{/if}

		{#key session}
		<section class="code-passage" class:keyword-passage={mode === "keywords"} aria-label={`${languages[langChoice]} ${mode === "keywords" ? "keywords" : "snippet"}`}>
			<div bind:this={codeScrollEl} class="code-scroll">
				<div class="typing-frame code-frame" class:caret-idle={game === "waiting"}>
					<input
						class="sr-only"
						id="boss"
						type="text"
						aria-label={mode === "keywords" ? "Type the practice keywords" : "Type the practice snippet"}
						autocomplete="off"
						autocapitalize="off"
						spellcheck={false}
						bind:this={inputEl}
						oninput={(event) => {
							typedLetter = event.currentTarget.value;
							if (mode === "keywords" && typedLetter.length === 1) {
								if (typedLetter === " ") {
									advanceWord();
									event.currentTarget.value = "";
									return;
								}
								startSession();
							}
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
									{#each line.content as word, index}
										<span>
											{#each word as letter}
												<span class="text-zinc-600"><span class="text-inherit">{letter}</span></span>
											{/each}
										</span>{#if mode === "keywords" && index < line.content.length - 1}{" "}{/if}
									{/each}
								</p>
							</div>
						{/each}
					</div>
					<div bind:this={caretEl} class="typing-caret bg-blue-300" aria-hidden="true"></div>
				</div>
			</div>
			{#if isBlur && game !== "finished"}
				<button type="button" class="typing-cover font-bold" tabindex="-1" bind:this={focusPrompt} onclick={() => inputEl.focus()}>
					Click here or press Tab to focus
				</button>
			{/if}
		</section>
		{/key}
		<button type="button" class="code-reset" aria-label="Reset code practice" title="Reset code practice" onclick={restart}><ResetSvg /></button>
	</div>
	{/if}

	<CodeSettingsModal open={settingsOpen} {mode} language={langChoice} bind:autoTabs limit={keywordLimit} {modifiers}
		onClose={() => { settingsOpen = false; }} onFocusFallback={() => { if (!results) inputEl.focus(); }}
		onModeChange={selectMode} onLanguageChange={selectLanguage} onLimitChange={selectLimit} onToggleModifier={toggleModifier}
	/>
</PracticeLayout>

<style>
	.code-layout { display: grid; grid-template-columns: minmax(0, 1fr); }
	.code-frame { --indent-correct: var(--palette-zinc-400); --indent-incorrect: var(--palette-red-500); }
	:global([data-theme="classic"]) .code-frame {
		--indent-correct: var(--ink);
		--indent-incorrect: var(--error);
	}
	:global([data-theme="classic"]) .code-frame :global(.text-zinc-500) { color: var(--ink); }
	.code-toolbar { display: grid; justify-items: start; gap: var(--dimension-0_75rem); margin-bottom: var(--dimension-1_55rem); }
	.mode-toggle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dimension-0_75rem);
		padding: var(--dimension-0_75rem) var(--dimension-1rem);
		border-radius: var(--radius-0_5rem);
		background: var(--surface);
		color: var(--muted);
		font-weight: var(--weight-600);
	}
	.mode-toggle button { display: inline-flex; align-items: center; gap: var(--dimension-0_25rem); }
	.mode-toggle [aria-pressed="true"] { color: var(--accent); text-decoration: underline; text-underline-offset: var(--dimension-0_14em); }
	.playing .code-toolbar { margin-bottom: 0; }
	.playing .code-passage { margin-top: var(--dimension-1_25rem); }

    .toolbar-row, .snippet-selector { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-0_75rem); }
    .toolbar-row { align-items: stretch; width: 100%; }
    .snippet-selector { min-height: var(--dimension-3rem); padding: 0 var(--dimension-1rem); border-radius: var(--radius-0_5rem); font-weight: var(--weight-600); background: var(--surface); color: var(--muted); }
    .snippet-selector button { border-inline-start: var(--dimension-2px) solid var(--inset); padding-inline-start: var(--dimension-0_75rem); color: var(--accent); }
    :global([data-theme="classic"]) :is(.mode-toggle, .snippet-selector) { background: var(--accent); color: color-mix(in srgb, var(--accent-ink) 60%, var(--accent)); color-scheme: dark; }
    :global([data-theme="classic"]) :is(.mode-toggle [aria-pressed="true"], .snippet-selector button) { color: var(--accent-ink); }
    :global([data-theme="classic"]) .snippet-selector button { border-color: currentColor; }
    :global([data-theme="classic"]) :is(.mode-toggle, .snippet-selector) { --focus-highlight: var(--accent-ink); }

	.code-scroll { position: relative; overflow-x: auto; scrollbar-color: var(--line) var(--inset); }
	.code-frame { width: max-content; min-width: 100%; font-family: inherit; }
	.code-line { display: flex; align-items: center; min-height: var(--practice-line-height); }
	.code-line-text { white-space: nowrap; }
	.code-line-text > span + span { margin-inline-start: calc(var(--dimension-1ch) + var(--dimension-0_25rem)); }
	.keyword-passage .code-frame { width: 100%; }
	.keyword-passage .code-line-text { white-space: normal; word-spacing: var(--dimension-0_25rem); }
	.keyword-passage .code-line-text > span { display: inline-block; white-space: nowrap; }
	.keyword-passage .code-line-text > span + span { margin-inline-start: 0; }
	.code-passage { position: relative; }
	.code-passage .typing-cover { background: transparent; }
	.code-reset { justify-self: center; margin-top: var(--dimension-1_25rem); color: var(--muted); }
	.code-reset:hover { color: var(--accent); }
	:global([data-theme="classic"]) .code-reset { color: var(--ink); }
	:global([data-theme="classic"]) .code-reset:is(:hover, :focus-visible) { background: var(--accent-wash); }
</style>
