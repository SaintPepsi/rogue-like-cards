export function useCardSelect() {
	let selectedIndex = $state(-1);
	let phaseIn = $state(false);
	let selecting = $state(false);
	let selectTimer: ReturnType<typeof setTimeout> | undefined;
	let phaseInTimer: ReturnType<typeof setTimeout> | undefined;

	function select(index: number, callback: () => void) {
		if (selecting) return;
		selectedIndex = index;
		selecting = true;

		// After out-animation (300ms), fire the callback and start phase-in
		selectTimer = setTimeout(() => {
			callback();
			selectedIndex = -1;
			selecting = false;
			phaseIn = true;

			phaseInTimer = setTimeout(() => {
				phaseIn = false;
			}, 200);
		}, 300);
	}

	function cleanup() {
		if (selectTimer !== undefined) clearTimeout(selectTimer);
		if (phaseInTimer !== undefined) clearTimeout(phaseInTimer);
		selectedIndex = -1;
		selecting = false;
		phaseIn = false;
	}

	return {
		get selectedIndex() {
			return selectedIndex;
		},
		get selecting() {
			return selecting;
		},
		get phaseIn() {
			return phaseIn;
		},
		select,
		cleanup
	};
}
