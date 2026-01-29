const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n: number): string {
	if (n < 1000) {
		return Math.floor(n).toString();
	}

	const tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), SUFFIXES.length - 1);

	if (tier === 0) {
		return Math.floor(n).toString();
	}

	const suffix = SUFFIXES[tier];
	const scaled = n / Math.pow(10, tier * 3);

	// Show 1 decimal place for cleaner display (e.g., 5.7B instead of 5B)
	if (scaled < 10) {
		return scaled.toFixed(2) + suffix;
	} else if (scaled < 100) {
		return scaled.toFixed(1) + suffix;
	} else {
		return Math.floor(scaled) + suffix;
	}
}
