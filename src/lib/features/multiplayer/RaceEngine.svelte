<script lang="ts">
	import { onDestroy, onMount, untrack } from "svelte";
	import {
		createTimer, game, raceMetricsCheckpoint, restoreRaceMetrics, sampleRace,
		timeDataArr, totalChars, typedChars, wordsArr,
	} from "./race.store";
	import { alignPracticeCaret } from "../practice/typing-dom";
	import socket from "./socket";

	let { ready = true, checkpointKey, roundId }: {
		ready?: boolean;
		checkpointKey?: string;
		roundId?: string;
	} = $props();

	let typedLetter = "";

	let currentIndex = {
		word: 0,
		letter: 0,
	};

	let multiplayerToggle = true;
	let caretEl = $state<HTMLDivElement>()!;
	let linesEl = $state<HTMLDivElement>()!;

	let wordEl = $state<HTMLSpanElement>()!;
	let nextwordEl: HTMLSpanElement | null;

	let letterEl = $state<HTMLSpanElement>()!;
	let nextLetterEl: HTMLSpanElement | null;

	let inputEl = $state<HTMLInputElement>()!;

	let lineH = 0;
	let lineNum = 0;

	let tick = false;

	let isBlur = $state(false);

	let wordsLog: { word: string; index: number }[] = [];

	const reLog = () => {
		wordsLog = $wordsArr.map((word) => {
			return {
				word: word,
				index: 0,
			};
		});
	};

	let mounted = $state(false);
	let intervalId: number | undefined;
	let reportedFinish = false;

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

	const unsubscribeWords = wordsArr.subscribe(reLog);
	onDestroy(unsubscribeWords);

	$effect(() => {
		if (!ready) {
			reportedFinish = false;
			return;
		}
		if (!mounted || $game !== "playing") return;

		inputEl.focus();
		isBlur = false;
		const timer = createTimer(saveCheckpoint);
		intervalId = timer;
		untrack(saveCheckpoint);
		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (!mounted || !ready || $game !== "playing" || reportedFinish ||
			$totalChars === 0 || $totalChars !== $typedChars) return;
		untrack(() => {
			reportedFinish = true;
			window.clearInterval(intervalId);
			const roomId = localStorage.getItem("roomId");
			const userId = localStorage.getItem("userId");
			sampleRace(true);
			saveCheckpoint();
			socket.emit("finishGame", { roomId, userId });
		});
	});

	const updateGameState = () => {
		if (!ready || $game !== "playing" || reportedFinish) return;
		setLetter();
		checkLetter();
		nextLetter();
		resetLetter();
		moveCaret("forward");
		saveCheckpoint();
	};

	const setLetter = () => {
		const isLastLetterCompleted = currentIndex.letter > $wordsArr[currentIndex.word].length - 1;
		const isLastLetter = currentIndex.letter === $wordsArr[currentIndex.word].length - 1;



		if (tick) {
			if (letterEl.children.length > 10) return;
			const extraLetter = document.createElement("span");
			extraLetter.className = "text-red-500";
			if (typedLetter === "\t") {
				extraLetter.textContent = "_";
			} else {
				extraLetter.textContent = typedLetter;
			}
			letterEl.appendChild(extraLetter);
			return;
		}

		wordEl = linesEl.children[currentIndex.word] as HTMLSpanElement;

		nextwordEl = linesEl.children[currentIndex.word + 1] as HTMLSpanElement;

		letterEl = wordEl.children[currentIndex.letter] as HTMLSpanElement;

		nextLetterEl = wordEl.children[currentIndex.letter + 1] as HTMLSpanElement;

		if (isLastLetter || isLastLetterCompleted) {

			letterEl = wordEl.children[wordEl.children.length - 1] as HTMLSpanElement;

			nextLetterEl = nextwordEl?.children[0] as HTMLSpanElement;
		}

		if (isLastLetterCompleted) {
			tick = true;
		}



	};

	const checkLetter = () => {
		if (letterEl.children.length > 1) {
			letterEl.children[letterEl.children.length - 1].className = "text-red-500";
			$timeDataArr.at(-1)!.extraChars += 1;
			$timeDataArr.at(-1)!.rawChars += 1;
			return;
		}

		if (letterEl.textContent?.charAt(0) === typedLetter) {
			letterEl.children[letterEl.children.length - 1].className = `text-white`;
			$timeDataArr.at(-1)!.correctChars += 1;
			$timeDataArr.at(-1)!.rawChars += 1;
			typedChars.update((n) => n + 1);
		}

		if (letterEl.children[letterEl.children.length - 1].textContent !== typedLetter) {
			letterEl.children[letterEl.children.length - 1].className = "text-red-500 underline";
			$timeDataArr.at(-1)!.incorrectChars += 1;
			$timeDataArr.at(-1)!.rawChars += 1;

		}
	};

	function nextWord() {
		const isNotFirstLetter = currentIndex.letter !== 0;
		const isOneLetterWord = $wordsArr[currentIndex.word].length === 1;

		if (isNotFirstLetter || isOneLetterWord) {
			tick = false;
			currentIndex.word += 1;
			currentIndex.letter = 0;
		}
	}

	const nextLetter = () => {
		const isLastLetter = currentIndex.letter === $wordsArr[currentIndex.word].length - 1;

		const isLastLetterCompleted = currentIndex.letter === $wordsArr[currentIndex.word].length;

		if (isLastLetterCompleted) {
			return;
		}
		currentIndex.letter += 1;

		if (isLastLetter) {
			tick = true;
		}

	};

	const prevWord = () => {
		if (currentIndex.word === 0) return;
		currentIndex.word -= 1;
		assignLog();
	};

	const prevletter = () => {
		if (currentIndex.letter === 0) return;
		currentIndex.letter -= 1;

	};

	function resetMissedLetters() {
		const wordLength = $wordsArr[currentIndex.word].length;
		for (let i = 0; i < wordLength; i++) {
			let prevClass = wordEl.children[i].children[0].className;
			wordEl.children[i].children[0].className = `${prevClass.replace(
				"decoration-red-500 underline",
				""
			)}`;
		}
	}

	const checkMissedLetters = () => {
		const wordLength = $wordsArr[currentIndex.word].length;
		if (wordLength !== wordsLog[currentIndex.word].index) {
			for (let i = 0; i < wordLength; i++) {
				let prevClass = wordEl.children[i].children[0].className;
				wordEl.children[i].children[0].className = `${prevClass} decoration-red-500 underline`;
			}
		}
	};

	const resetLetter = () => {
		typedLetter = "";
	};

	const updateLog = () => {
		wordsLog[currentIndex.word]["index"] = currentIndex.letter;
	};
	const assignLog = () => {
		currentIndex.letter = wordsLog[currentIndex.word]["index"];
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.code === "Space") {
			e.preventDefault();
		}
		if (e.code === "Enter") {
			e.preventDefault();
		}

		if (ready && $game === "playing" && !reportedFinish) {

			if (e.code === "Space") {
				const isLastWord = currentIndex.word + 1 >= $wordsArr.length;

				const isFirstLetter = currentIndex.letter === 0;
				const isLastLetter = currentIndex.letter === $wordsArr[currentIndex.word].length;

				const isVeryFirstLetter = currentIndex.word === 0 && currentIndex.letter === 0;

				if (isVeryFirstLetter) return;
				if (isFirstLetter) return;
				if (isLastWord) return;
				if (!isLastLetter && multiplayerToggle) return;
				typedChars.update((n) => n + 1);
				updateLog();
				checkMissedLetters();
				nextWord();
				moveCaret("space");
			}
			if (e.code === "Backspace") {

				const isFirstWord = currentIndex.word === 0;
				const isFirstLetter = currentIndex.letter === 0;

				const isLastLetterCompleted = currentIndex.letter === $wordsArr[currentIndex.word].length;

				const hasExtras = letterEl.children.length > 1;

				if (isFirstWord && isFirstLetter) return;

				if (isLastLetterCompleted && hasExtras) {
					letterEl.removeChild(letterEl.children[letterEl.children.length - 1]);
					tick = true;
					moveCaret("backward");
					return;
				}

				if (!isFirstLetter) {
					prevletter();
					tick = false;
					setLetter();
					if (letterEl!.children[0].className === `text-white`) {
						typedChars.update((n) => n - 1);
					}
					letterEl.children[letterEl.children.length - 1].className = `text-zinc-600`;
					moveCaret("backward");

				}

				if (isFirstLetter) {
					prevWord();
					setLetter();
					resetMissedLetters();
					moveCaret("backward");
					typedChars.update((n) => n - 1);

				}
			}
		}
	};

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

		checkpoint.words.forEach((word, wordIndex) => {
			word.forEach(({ feedback, extras }, letterIndex) => {
				const letter = linesEl.children[wordIndex].children[letterIndex];
				letter.children[0].className = feedback;
				for (const extra of extras) {
					const element = document.createElement("span");
					element.className = "text-red-500";
					element.textContent = extra;
					letter.appendChild(element);
				}
			});
		});

		// Rebuild scroll and the backspace history for the current viewport.
		for (let word = 0; word < checkpoint.position.word; word++) {
			currentIndex.word = word;
			currentIndex.letter = $wordsArr[word].length;
			updateLog();
			tick = false;
			setLetter();
			moveCaret("space");
		}
		currentIndex = checkpoint.position;
		tick = false;
		setLetter();
		if (tick) {
			moveCaret("forward");
		} else {
			caretEl.style.left = `${letterEl.offsetLeft}px`;
			caretEl.style.top = `${letterEl.offsetTop - lineH + 2}px`;
		}
		restoreRaceMetrics(checkpoint.metrics);
		typedChars.set(checkpoint.typedChars);
	}

	let tempFirstLine = 0;

	function moveCaret(type: "backward" | "forward" | "space") {
		caretEl.style.top = `${letterEl.offsetTop - lineH}px`;
		const H = linesEl.scrollHeight;

		if (type === "forward") {
			caretEl.style.left = `${letterEl.offsetLeft + letterEl.offsetWidth}px`;
		}
		if (type === "backward") {
			if (letterEl.children.length > 1) {
				caretEl.style.left = `${
					(letterEl.children[letterEl.children.length - 1] as HTMLSpanElement).offsetLeft +
					(letterEl.children[letterEl.children.length - 1] as HTMLSpanElement).offsetWidth
				}px`;
			}
			if (currentIndex.letter === $wordsArr[currentIndex.word].length) {
				caretEl.style.left = `${letterEl.offsetLeft + letterEl.offsetWidth}px`;
			} else {
				caretEl.style.left = `${letterEl.offsetLeft}px`;
			}
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
		<input
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
				typedLetter = event.currentTarget.value;
				if (typedLetter.length === 1) updateGameState();
				event.currentTarget.value = "";
			}}
			onkeydown={(event) => {
				handleKeydown(event);
				if (event.code === "Space" || event.code === "Backspace") saveCheckpoint();
			}}
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
</section>

<style>
	.race-passage .typing-frame { font-family: inherit; }
	.race-passage .typing-window { font-size: clamp(var(--text-1rem), var(--text-2vw), var(--text-1_25rem)); }
	.race-passage .typing-cover { background: transparent; color: var(--muted); }
</style>
