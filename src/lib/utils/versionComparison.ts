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
