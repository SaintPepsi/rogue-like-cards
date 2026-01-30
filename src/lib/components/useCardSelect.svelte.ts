export function useCardSelect() {
	let selectedIndex = $state(-1);
	let selecting = $state(false);
	let selectTimer: ReturnType<typeof setTimeout> | undefined;

	function select(index: number, callback: () => void) {
		if (selecting) return;
		selectedIndex = index;
		selecting = true;

		// After card animation (300ms), fire callback.
		// Don't reset state — the component may be exiting and should
		// freeze with the selected card highlighted.
		selectTimer = setTimeout(() => {
			callback();
		}, 300);
	}

	function cleanup() {
		if (selectTimer !== undefined) clearTimeout(selectTimer);
		selectedIndex = -1;
		selecting = false;
	}

	return {
		get selectedIndex() {
			return selectedIndex;
		},
		get selecting() {
			return selecting;
		},
		select,
		cleanup
	};
}
