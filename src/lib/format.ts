const SUFFIXES = [
	'', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
	'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'ODc', 'NDc',
	'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OVg', 'NVg',
	'Tg', 'UTg', 'DTg', 'TTg', 'QaTg', 'QiTg', 'SxTg', 'SpTg', 'OTg', 'NTg',
	'Qd', 'UQd', 'DQd', 'TQd', 'QaQd', 'QiQd', 'SxQd', 'SpQd', 'OQd', 'NQd',
	'Qq', 'UQq', 'DQq', 'TQq', 'QaQq', 'QiQq', 'SxQq', 'SpQq', 'OQq', 'NQq',
	'Sg', 'USg', 'DSg', 'TSg', 'QaSg', 'QiSg', 'SxSg', 'SpSg', 'OSg', 'NSg',
	'St', 'USt', 'DSt', 'TSt', 'QaSt', 'QiSt', 'SxSt', 'SpSt', 'OSt', 'NSt',
	'Og', 'UOg', 'DOg', 'TOg', 'QaOg', 'QiOg', 'SxOg', 'SpOg', 'OOg', 'NOg',
	'Ng', 'UNg', 'DNg', 'TNg', 'QaNg', 'QiNg', 'SxNg', 'SpNg', 'ONg', 'NNg',
	'Ce'
];

export function formatNumber(n: number): string {
	if (!isFinite(n)) return '∞';
	if (n < 1000) {
		return Math.floor(n).toString();
	}

	const log = Math.log10(Math.abs(n));
	const tier = Math.floor(log / 3);

	if (tier === 0) {
		return Math.floor(n).toString();
	}

	// Beyond all suffixes: use scientific notation
	if (tier >= SUFFIXES.length) {
		const exponent = Math.floor(log);
		const mantissa = n / Math.pow(10, exponent);
		return mantissa.toFixed(2) + 'e' + exponent;
	}

	const suffix = SUFFIXES[tier];
	const scaled = n / Math.pow(10, tier * 3);

	if (scaled < 10) {
		return scaled.toFixed(2) + suffix;
	} else if (scaled < 100) {
		return scaled.toFixed(1) + suffix;
	} else {
		return Math.floor(scaled) + suffix;
	}
}
