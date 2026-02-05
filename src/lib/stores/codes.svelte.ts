const CODES_STORAGE_KEY = 'roguelike-cards-codes';

const VALID_CODES = ['clacker'] as const;
type ValidCode = (typeof VALID_CODES)[number];

function isValidCode(code: string): code is ValidCode {
	return (VALID_CODES as readonly string[]).includes(code);
}

function createCodes() {
	let unlockedCodes = $state<Set<string>>(new Set());

	function load(): void {
		try {
			const saved = localStorage.getItem(CODES_STORAGE_KEY);
			if (!saved) return;
			const parsed = JSON.parse(saved) as string[];
			unlockedCodes = new Set(parsed.filter(isValidCode));
		} catch {
			// Ignore corrupted data
		}
	}

	function save(): void {
		try {
			localStorage.setItem(CODES_STORAGE_KEY, JSON.stringify([...unlockedCodes]));
		} catch {
			// Ignore storage errors
		}
	}

	function submitCode(code: string): boolean {
		const normalized = code.trim().toLowerCase();
		if (!isValidCode(normalized)) return false;
		if (unlockedCodes.has(normalized)) return false;
		unlockedCodes = new Set([...unlockedCodes, normalized]);
		save();
		return true;
	}

	return {
		get autoclickerUnlocked() {
			return unlockedCodes.has('clacker');
		},
		load,
		submitCode
	};
}

export const codes = createCodes();
