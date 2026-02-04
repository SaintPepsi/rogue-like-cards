// DECISION: Store changelog version in localStorage to track what user has seen
// Why: Simple persistence that works across browser sessions without server state
// Key choice: Using single key for last seen version rather than set of all seen versions

export const STORAGE_KEY = 'changelog_last_seen_version';

/**
 * Get the last changelog version the user has seen.
 * Returns null if no version has been stored or if running in SSR context.
 */
export function getLastSeenVersion(): string | null {
	// SSR guard: localStorage only exists in browser
	if (typeof window === 'undefined') {
		return null;
	}

	return localStorage.getItem(STORAGE_KEY);
}

/**
 * Store the last changelog version the user has seen.
 * Does nothing if running in SSR context.
 */
export function setLastSeenVersion(version: string): void {
	// SSR guard: localStorage only exists in browser
	if (typeof window === 'undefined') {
		return;
	}

	localStorage.setItem(STORAGE_KEY, version);
}
