export const RESET_STORAGE_KEY = 'roguelike-cards-reset-version';

export function getLastResetVersion(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(RESET_STORAGE_KEY);
}

export function setLastResetVersion(version: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(RESET_STORAGE_KEY, version);
}
