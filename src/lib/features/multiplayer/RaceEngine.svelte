<script lang="ts">
	import { onMount, untrack } from "svelte";
	import {
		createTimer, enteredChars, game, raceMetricsCheckpoint, restoreRaceMetrics, sampleRace,
		timeDataArr, totalChars, typedChars, uncorrectedExtras, wordsArr,
	} from "./race.store";
	import { alignPracticeCaret } from "../practice/typing-dom";
	import socket from "./socket";
	import { raceErrorsToCorrect, type RaceSettings } from "../../../../backend/src/race.settings";

	let { ready = true, settings, checkpointKey, roundId }: {
		ready?: boolean;
		settings: RaceSettings;
		checkpointKey?: string;
		roundId?: string;
	} = $props();

	let currentIndex = {
		word: 0,
		letter: 0,
	};

	let caretEl = $state<HTMLDivElement>()!;
	let linesEl = $state<HTMLDivElement>()!;

	let wordEl = $state<HTMLSpanElement>()!;
	let nextwordEl: HTMLSpanElement | null;

	let letterEl = $state<HTMLSpanElement>()!;
	let nextLetterEl: HTMLSpanElement | null;

	let inputEl = $state<HTMLInputElement>()!;

	let lineH = 0;
	let lineNum = 0;

	let isBlur = $state(false);

	let mounted = $state(false);
	let reportedFinish = false;
	const atPassageEnd = $derived(settings.mode !== "time" && $totalChars > 0 && $enteredChars === $totalChars);
	const errorsToCorrect = $derived(raceErrorsToCorrect(settings.mode === "time" ? $enteredChars : $totalChars,
		$typedChars, $uncorrectedExtras, settings.errorThreshold));

	onMount(() => {
		restoreCheckpoint();
		isBlur = true;
		mounted = true;
		const observer = new ResizeObserver(() => {
			const word = linesEl.children[currentIndex.word];
			const atEnd = currentIndex.letter === word.children.length;
			const target = word.children[Math.min(currentIndex.letter, word.children.length - 1)] as HTMLElement;
			const first = linesEl.firstElementChild!.firstElementChild as HTMLElement;
			caretEl.style.left = `${target.offsetLeft + (atEnd ? target.offsetWidth : 0)}px`;
			alignPracticeCaret(caretEl, linesEl, target, word);
			lineH = linesEl.scrollTop;
			lineNum = Math.round((target.offsetTop - first.offsetTop) / 28);
			tempFirstLine = Math.round(lineH / 28);
		});
		observer.observe(linesEl);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!ready) {
			reportedFinish = false;
			return;
		}
		if (!mounted || $game !== "playing") return;

		inputEl.focus();
		isBlur = false;
		const timer = createTimer(saveCheckpoint, settings.mode === "time");
		untrack(saveCheckpoint);
		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (!mounted || !ready || $game !== "playing" || !atPassageEnd || errorsToCorrect || reportedFinish) return;
		untrack(() => {
			reportedFinish = true;
			const roomId = localStorage.getItem("roomId");
			const userId = localStorage.getItem("userId");
			sampleRace("finish");
			saveCheckpoint();
			socket.emit("finishGame", { roomId, userId });
		});
	});

	function selectLetter() {
		wordEl = linesEl.children[currentIndex.word] as HTMLSpanElement;
		nextwordEl = linesEl.children[currentIndex.word + 1] as HTMLSpanElement;
		letterEl = wordEl.children[Math.min(currentIndex.letter, wordEl.children.length - 1)] as HTMLSpanElement;
		nextLetterEl = (letterEl.nextElementSibling ?? nextwordEl?.firstElementChild) as HTMLSpanElement | null;
	}

	function advanceWord() {
		if (currentIndex.letter !== $wordsArr[currentIndex.word].length || currentIndex.word + 1 >= $wordsArr.length) return;
		selectLetter();
		currentIndex.word += 1;
		currentIndex.letter = 0;
		$typedChars += 1;
		$enteredChars += 1;
		moveCaret("space");
		saveCheckpoint();
	}

	function typeCharacter(character: string) {
		if (!ready || $game !== "playing" || reportedFinish) return;
		if (character === " ") {
			advanceWord();
			return;
		}
		selectLetter();
		const sample = $timeDataArr.at(-1)!;
		if (currentIndex.letter === $wordsArr[currentIndex.word].length) {
			if (letterEl.children.length > 10) return;
			const extra = document.createElement("span");
			extra.className = "text-red-500";
			extra.textContent = character === "\t" ? "_" : character;
			letterEl.appendChild(extra);
			sample.extraChars += 1;
			$uncorrectedExtras += 1;
		} else {
			const feedback = letterEl.firstElementChild!;
			if (feedback.textContent === character) {
				feedback.className = "text-white";
				sample.correctChars += 1;
				$typedChars += 1;
			} else {
				feedback.className = "text-red-500 underline";
				sample.incorrectChars += 1;
			}
			currentIndex.letter += 1;
			$enteredChars += 1;
		}
		sample.rawChars += 1;
		moveCaret("forward");
		saveCheckpoint();
	}

	function eraseCharacter() {
		if ($enteredChars === 0) return;
		selectLetter();
		if (currentIndex.letter === $wordsArr[currentIndex.word].length && letterEl.children.length > 1) {
			letterEl.lastElementChild!.remove();
			$uncorrectedExtras -= 1;
		} else {
			if (currentIndex.letter === 0) {
				currentIndex.word -= 1;
				currentIndex.letter = $wordsArr[currentIndex.word].length;
				selectLetter();
				$typedChars -= 1;
			} else {
				currentIndex.letter -= 1;
				selectLetter();
				const feedback = letterEl.firstElementChild!;
				if (feedback.className === "text-white") $typedChars -= 1;
				feedback.className = "text-zinc-600";
			}
			$enteredChars -= 1;
		}
		moveCaret("backward");
		saveCheckpoint();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.code === "Space" || event.code === "Enter") event.preventDefault();
		if (!ready || $game !== "playing" || reportedFinish) return;
		if (event.code === "Space") advanceWord();
		if (event.code === "Backspace") eraseCharacter();
	}

	type RaceCheckpoint = {
		roundId: string;
		position: typeof currentIndex;
		typedChars: number;
		words: { feedback: string; extras: string[] }[][];
		metrics: ReturnType<typeof raceMetricsCheckpoint>;
	};

	function saveCheckpoint() {
		if (!checkpointKey || !roundId || !ready || $game !== "playing") return;
		const checkpoint: RaceCheckpoint = {
			roundId,
			position: currentIndex,
			typedChars: $typedChars,
			words: Array.from(linesEl.children, (word) =>
				Array.from(word.children, (letter) => ({
					feedback: letter.children[0].className,
					extras: Array.from(letter.children).slice(1).map((extra) => extra.textContent ?? ""),
				}))
			),
			metrics: raceMetricsCheckpoint(),
		};
		localStorage.setItem(checkpointKey, JSON.stringify(checkpoint));
	}

	function restoreCheckpoint() {
		if (!checkpointKey || !roundId) return;
		const saved = localStorage.getItem(checkpointKey);
		if (!saved) return;
		let checkpoint: RaceCheckpoint;
		try {
			checkpoint = JSON.parse(saved);
		} catch {
			return;
		}
		if (checkpoint?.roundId !== roundId) return;

		let extrasCount = 0;
		checkpoint.words.forEach((word, wordIndex) => {
			word.forEach(({ feedback, extras }, letterIndex) => {
				const letter = linesEl.children[wordIndex].children[letterIndex];
				letter.children[0].className = feedback;
				extrasCount += extras.length;
				for (const extra of extras) {
					const element = document.createElement("span");
					element.className = "text-red-500";
					element.textContent = extra;
					letter.appendChild(element);
				}
			});
		});

		// Rebuild scroll for the current viewport.
		for (let word = 0; word < checkpoint.position.word; word++) {
			currentIndex.word = word;
			currentIndex.letter = $wordsArr[word].length;
			selectLetter();
			moveCaret("space");
		}
		currentIndex = checkpoint.position;
		selectLetter();
		if (currentIndex.letter === $wordsArr[currentIndex.word].length) {
			moveCaret("forward");
		} else {
			caretEl.style.left = `${letterEl.offsetLeft}px`;
			caretEl.style.top = `${letterEl.offsetTop - lineH + 2}px`;
		}
		restoreRaceMetrics(checkpoint.metrics);
		$typedChars = checkpoint.typedChars;
		$enteredChars = $wordsArr.slice(0, currentIndex.word).reduce((count, word) => count + word.length + 1, currentIndex.letter);
		$uncorrectedExtras = extrasCount;
	}

	let tempFirstLine = 0;

	function moveCaret(type: "backward" | "forward" | "space") {
		caretEl.style.top = `${letterEl.offsetTop - lineH}px`;
		const H = linesEl.scrollHeight;

		if (type === "forward") {
			caretEl.style.left = `${letterEl.offsetLeft + letterEl.offsetWidth}px`;
		}
		if (type === "space") {
			caretEl.style.left = `${nextwordEl!.offsetLeft}px`;
			caretEl.style.top = `${nextwordEl!.offsetTop - lineH + 2}px`;
			//Responsive
			if (nextwordEl!.offsetTop !== letterEl.offsetTop) {
				if (lineNum > 0 && H / 28 > lineNum + 3 && linesEl.scrollHeight > 112) {
					linesEl.scrollBy(0, 28);
					lineH += 28;
					tempFirstLine += 1;
				}
				lineNum += 1;
				caretEl.style.top = `${nextwordEl!.offsetTop - lineH + 2}px`;
			}
		}
		if (type === "backward") {
			const atWordEnd = currentIndex.letter === $wordsArr[currentIndex.word].length;
			if (atWordEnd && nextLetterEl && nextLetterEl.offsetTop !== letterEl.offsetTop) {
				if (tempFirstLine > 0 && lineNum > 0 && H / 28 > lineNum + 2) {
					linesEl.scrollBy(0, -28);
					lineH -= 28;
					tempFirstLine -= 1;
				}
				lineNum -= 1;
				caretEl.style.top = `${wordEl!.offsetTop - lineH + 2}px`;
			}
			if (currentIndex.letter === $wordsArr[currentIndex.word].length) {
				caretEl.style.left = `${letterEl.offsetLeft + letterEl.offsetWidth}px`;
			} else {
				caretEl.style.left = `${letterEl.offsetLeft}px`;
			}
		}
	}
</script>

<section class="race-passage" aria-label="Race passage">
	<div class="typing-frame">
		<input tabindex="0"
			class="sr-only"
			id="boss"
			type="text"
			aria-label="Type the race passage"
			autocomplete="off"
			autocapitalize="off"
			spellcheck={false}
			disabled={!ready}
			bind:this={inputEl}
			oninput={(event) => {
				const value = event.currentTarget.value;
				if (value.length === 1) typeCharacter(value);
				event.currentTarget.value = "";
			}}
			onkeydown={handleKeydown}
			onblur={() => { isBlur = true; }}
			onfocus={() => { isBlur = false; }}
		/>
		<div bind:this={linesEl} class="typing-window">
			{#each $wordsArr as word, index}
				<span bind:this={wordEl} class="typing-word">
					{#each word as letter}
						<span bind:this={letterEl} class="tracking-wider text-zinc-600"><span class="text-inherit">{letter}</span></span>
					{/each}
				</span>{#if index < $wordsArr.length - 1}{" "}{/if}
			{/each}
		</div>
		<div bind:this={caretEl} class="typing-caret bg-blue-300" aria-hidden="true"></div>
		{#if !ready}
			<div class="typing-cover" role="status">Reconnecting…</div>
		{:else if isBlur && $game === "playing"}
			<button class="typing-cover" tabindex="-1" onclick={() => inputEl.focus()}>
				<span>Click to focus and type</span>
			</button>
		{/if}
	</div>
	{#if ready && $game === "playing" && (atPassageEnd || settings.mode === "time") && errorsToCorrect}
		<p class="finish-hint" aria-live={settings.mode === "time" ? "off" : "polite"}>Correct {errorsToCorrect} more {errorsToCorrect === 1 ? "error" : "errors"} to {settings.mode === "time" ? "qualify" : "finish"} ({settings.errorThreshold}% allowed).</p>
	{/if}
</section>

<style>
	.race-passage .typing-frame { font-family: inherit; }
	.race-passage .typing-window { font-size: clamp(var(--text-1rem), var(--text-2vw), var(--text-1_25rem)); }
	.race-passage .typing-cover { background: transparent; color: var(--muted); }
	.finish-hint { color: var(--ink); font-size: var(--text-0_875rem); margin-top: var(--dimension-0_75rem); }
</style>
