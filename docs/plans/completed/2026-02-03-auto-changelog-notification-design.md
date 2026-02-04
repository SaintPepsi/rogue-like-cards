# Auto-Show Changelog for New Versions

## Overview

Show the changelog modal automatically when users load the app after a version bump, displaying only entries they haven't seen before. New users see only the current version. The modal appears once per version and doesn't show persistent badges or reminders.

## Storage & Persistence

**LocalStorage key:** `lastSeenChangelogVersion`

**Value:** Version string (e.g., `"0.42.0"`)

**Persistence:** Across browser sessions and tabs. User sees new changelog entries only once.

## Version Tracking & Comparison

### On App Mount

1. Read `VERSION` from `version.ts`
2. Read `lastSeenChangelogVersion` from localStorage
3. If no stored version exists (new user):
   ```ts
   const [major, minor] = VERSION.split('.').map(Number);
   const previousMinor = `${major}.${minor - 1}.0`;
   // Treat as if they last saw previous minor version
   // They'll only see current version's entries
   ```
4. Compare versions to determine which changelog entries are "new"

### Version Comparison Logic

```ts
function isVersionGreaterThan(versionA: string, versionB: string): boolean {
	const parseVersion = (v: string) => v.split('.').map(Number);
	const [majorA, minorA, patchA] = parseVersion(versionA);
	const [majorB, minorB, patchB] = parseVersion(versionB);

	if (majorA !== majorB) return majorA > majorB;
	if (minorA !== minorB) return minorA > minorB;
	return patchA > patchB;
}
```

### Filter Logic

```ts
function getNewChangelogEntries(lastSeenVersion: string): ChangelogEntry[] {
	return CHANGELOG.filter((entry) => isVersionGreaterThan(entry.version, lastSeenVersion));
}
```

### Storage Update

- **When:** User closes the changelog modal (`onClose()` callback)
- **Action:** Set `lastSeenChangelogVersion` to current `VERSION`
- **Effect:** Marks everything up to current version as "seen"

## Component Changes

### ChangelogModal.svelte

**New prop:**

```ts
type Props = {
	show: boolean;
	onClose: () => void;
	entries?: ChangelogEntry[]; // Optional, defaults to CHANGELOG
};
```

**Rendering:**

- Iterate over `entries ?? CHANGELOG`
- No other logic changes needed
- Component remains a pure renderer

### Parent Component (Root Layout/Page)

**State:**

```ts
let showChangelog = $state(false);
let changelogEntries = $state<ChangelogEntry[]>(CHANGELOG);
```

**Auto-show logic ($effect on mount):**

1. Read `lastSeenChangelogVersion` from localStorage
2. Calculate which entries are new using `getNewChangelogEntries()`
3. If new entries exist:
   - Set `changelogEntries` to filtered list
   - Set `showChangelog = true`

**handleClose function:**

1. Set `showChangelog = false`
2. Write `VERSION` to localStorage as `lastSeenChangelogVersion`
3. Reset `changelogEntries` back to full `CHANGELOG` (for future manual views)

**Manual "View Changelog" button:**

- When clicked, sets `changelogEntries = CHANGELOG` (full history)
- Sets `showChangelog = true`
- User sees complete changelog history

## User Experience

### New User (First Visit)

- No `lastSeenChangelogVersion` in storage
- Modal shows only the current version's entries (e.g., v0.42.0)
- Not overwhelmed with full history
- After closing, current version stored

### Returning User (Version Bump)

- User last saw v0.29.0, current is v0.42.0
- Modal shows all entries from v0.30.0 through v0.42.0
- After closing, v0.42.0 stored as last seen

### Returning User (No Version Change)

- User last saw v0.42.0, current is still v0.42.0
- No modal appears
- Can still manually view changelog via button

### Manual Viewing

- User clicks changelog button anytime
- Modal shows full history (all CHANGELOG entries)
- Does not update `lastSeenChangelogVersion` storage

## Edge Cases

### Version Skipping

- User on v0.30.0, you hotfix and release v0.28.1
- They won't see v0.28.1 (acceptable trade-off for simplicity)
- Hotfixes to older versions are rare

### Cleared Storage

- Treated same as new user
- Shows only current version's entries

### Rapid Version Bumps

- User sees v0.40.0, dismisses modal
- You immediately release v0.41.0 before they refresh
- On next load, they see only v0.41.0 entries (v0.40.0 was already seen)

## Implementation Notes

- All version comparison logic should live in parent component or a utility file
- ChangelogModal.svelte remains presentational only
- No visual badge/indicator after modal dismissal
- Auto-show on initial app load is the only notification mechanism
