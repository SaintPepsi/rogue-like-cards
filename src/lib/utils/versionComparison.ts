import type { ChangelogEntry } from '$lib/changelog';

/**
 * Compares two semantic version strings (major.minor.patch).
 *
 * @param version1 - The first version string to compare
 * @param version2 - The second version string to compare
 * @returns true if version1 > version2, false otherwise
 */
export function isVersionGreaterThan(version1: string, version2: string): boolean {
	const [major1, minor1, patch1] = version1.split('.').map(Number);
	const [major2, minor2, patch2] = version2.split('.').map(Number);

	if (major1 !== major2) {
		return major1 > major2;
	}

	if (minor1 !== minor2) {
		return minor1 > minor2;
	}

	return patch1 > patch2;
}

/**
 * Filters changelog entries to only those newer than a given version.
 *
 * @param changelog - Array of changelog entries to filter
 * @param lastSeenVersion - The last version the user has seen
 * @returns Array of changelog entries with version > lastSeenVersion
 */
export function getNewChangelogEntries(
	changelog: ChangelogEntry[],
	lastSeenVersion: string
): ChangelogEntry[] {
	return changelog.filter((entry) => isVersionGreaterThan(entry.version, lastSeenVersion));
}

/**
 * Calculates the previous minor version (e.g., 0.5.0 -> 0.4.0).
 * Returns 0.0.0 when the input version is already 0.0.0.
 *
 * @param currentVersion - The current version string
 * @returns The previous minor version string with patch set to 0
 */
export function getPreviousMinorVersion(currentVersion: string): string {
	const [major, minor] = currentVersion.split('.').map(Number);

	// Edge case: already at minimum version
	if (major === 0 && minor === 0) {
		return '0.0.0';
	}

	// If minor is 0, decrement major and reset minor to 0
	if (minor === 0) {
		return `${major - 1}.0.0`;
	}

	// Normal case: decrement minor
	return `${major}.${minor - 1}.0`;
}
