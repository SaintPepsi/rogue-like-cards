export function useCardFlip() {
	let flippedCards = $state<boolean[]>([]);
	let enabledCards = $state<boolean[]>([]);
	let flipTimers: ReturnType<typeof setTimeout>[] = [];

	function startFlip(count: number) {
		flippedCards = Array(count).fill(false);
		enabledCards = Array(count).fill(false);
		flipTimers.forEach(clearTimeout);
		flipTimers = [];

		for (let i = 0; i < count; i++) {
			flipTimers.push(
				setTimeout(() => {
					flippedCards[i] = true;
				}, 200 + i * 250)
			);
			flipTimers.push(
				setTimeout(() => {
					enabledCards[i] = true;
				}, 200 + i * 250 + 600)
			);
		}
	}

	function cleanup() {
		flipTimers.forEach(clearTimeout);
		flipTimers = [];
	}

	return {
		get flippedCards() {
			return flippedCards;
		},
		get enabledCards() {
			return enabledCards;
		},
		startFlip,
		cleanup
	};
}
