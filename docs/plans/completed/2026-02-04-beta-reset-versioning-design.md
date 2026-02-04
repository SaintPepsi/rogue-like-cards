# Beta Reset Versioning Design

**Date:** 2026-02-04
**Status:** Implemented

## Overview

Add ability to pin a specific version as a "reset version" where player data automatically resets if they haven't experienced that reset yet. This enables testing new flows during beta development without requiring manual data clearing.

## Requirements

- **Reset trigger:** When `currentGameVersion >= resetVersion AND lastResetVersion < resetVersion`
- **Data clearing:** Clear everything (both session and persistent data)
- **User experience:** Silent reset (no UI indication)
- **Version comparison:** Semantic version comparison (major.minor.patch)

## Architecture

### Current System

- Game version: `src/lib/version.ts` (currently `0.42.0`)
- Persistence: Two localStorage keys
  - `roguelike-cards-save` (session data)
  - `roguelike-cards-persistent` (persistent data)
- Version utilities: `src/lib/utils/versionComparison.ts` has `isVersionGreaterThan()`
- Similar pattern: Changelog system uses `changelog_last_seen_version` in localStorage

### Reset Version Flow

1. On game initialization (`init()` in `gameState.svelte.ts`):
   - Load `lastResetVersion` from localStorage (`roguelike-cards-reset-version` key)
   - If `lastResetVersion` doesn't exist OR `lastResetVersion < RESET_VERSION`:
     - Clear both session and persistent data
     - Save `RESET_VERSION` to localStorage as `lastResetVersion`
     - Proceed with fresh game initialization
   - Otherwise, proceed with normal load/init flow

2. First-time players:
   - No `lastResetVersion` stored → don't trigger reset
   - Save current `RESET_VERSION` to establish baseline

3. Returning players:
   - If they've already experienced the reset (`lastResetVersion >= RESET_VERSION`) → no reset
   - If they haven't (`lastResetVersion < RESET_VERSION`) → trigger reset

## Implementation

### New Storage Module: `src/lib/utils/resetVersionStorage.ts`

```ts
export const RESET_STORAGE_KEY = 'roguelike-cards-reset-version';

export function getLastResetVersion(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(RESET_STORAGE_KEY);
}

export function setLastResetVersion(version: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(RESET_STORAGE_KEY, version);
}
```

### Version Module: `src/lib/version.ts`

```ts
export const VERSION = '0.42.0';
export const RESET_VERSION = '0.42.0'; // Update this when reset is needed
```

### Reset Check Function: `src/lib/utils/versionComparison.ts`

```ts
export function shouldTriggerReset(
	currentVersion: string,
	resetVersion: string,
	lastResetVersion: string | null
): boolean {
	// First time player (no lastResetVersion stored)
	if (!lastResetVersion) {
		return false; // New player, don't reset
	}

	// Current game version must be >= reset version
	const isCurrentAtOrBeyondReset =
		currentVersion === resetVersion || isVersionGreaterThan(currentVersion, resetVersion);

	// Last reset must be before the target reset version
	const lastResetBeforeTarget = isVersionGreaterThan(resetVersion, lastResetVersion);

	return isCurrentAtOrBeyondReset && lastResetBeforeTarget;
}
```

### Integration Point: `gameState.svelte.ts` `init()` function

```ts
function init() {
	// Check if we need to reset due to version change
	const lastResetVersion = getLastResetVersion();
	if (shouldTriggerReset(VERSION, RESET_VERSION, lastResetVersion)) {
		persistence.clearSession();
		persistence.clearPersistent();
		setLastResetVersion(RESET_VERSION);
	}

	// Save reset version for first-time players
	if (!lastResetVersion) {
		setLastResetVersion(RESET_VERSION);
	}

	// Continue with normal initialization
	shop.load();
	// ... rest of init
}
```

### Why No Shop Clear Method?

Shop data is stored in `PersistentSaveData` (the `roguelike-cards-persistent` key). When `persistence.clearPersistent()` is called, it removes this entire key from localStorage. Subsequently, `shop.load()` calls `persistence.loadPersistent()` which returns `null`, causing the shop to initialize with default values automatically.

## Testing Strategy

### Unit Tests: `src/lib/utils/versionComparison.test.ts`

```ts
describe('shouldTriggerReset', () => {
	it('returns false for first-time players (no lastResetVersion)', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', null)).toBe(false);
	});

	it('returns true when current >= reset AND last reset < reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.23.0')).toBe(true);
	});

	it('returns false when last reset already matches reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.5.0')).toBe(false);
	});

	it('returns false when last reset is beyond reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.10.0')).toBe(false);
	});

	it('returns false when current version is below reset version', () => {
		expect(shouldTriggerReset('0.4.0', '0.5.0', '0.3.0')).toBe(false);
	});
});
```

### Integration Tests

Add to `src/lib/stores/gameState.test.ts`:

- Reset clears both session and persistent data
- Reset updates lastResetVersion in localStorage
- Normal load/save works after a reset
- First-time players don't trigger reset
- Players who already experienced the reset don't reset again

### Manual Testing

1. Set `RESET_VERSION` to a version higher than current localStorage value
2. Reload game → verify all data is cleared
3. Play a bit → verify game works normally after reset
4. Reload again → verify reset doesn't trigger twice
5. Set `RESET_VERSION` back to current → verify no reset occurs

## Example Usage

**Scenario:** Need to test new onboarding flow in v0.50.0

1. Change `RESET_VERSION = '0.50.0'` in `version.ts`
2. Deploy/run locally
3. All players (including yourself) will have data reset on next load
4. Players can now experience the new flow from scratch
5. Subsequent reloads won't reset again (unless you bump `RESET_VERSION` higher)

**Scenario:** Player progression from v0.23 → v0.67

- Player on v0.23.0 with `lastResetVersion = '0.23.0'`
- Developer sets `RESET_VERSION = '0.5.0'`
- Player opens game at v0.67.0
- Check: `v0.67.0 >= v0.5.0` ✓ AND `v0.23.0 < v0.5.0` ✓
- **Result:** Reset triggered, data cleared, `lastResetVersion` set to `0.5.0`
