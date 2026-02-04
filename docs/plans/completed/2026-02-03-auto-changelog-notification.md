# Auto-Show Changelog for New Versions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use coca-wits:executing-plans to implement this plan task-by-task.

**Goal:** Automatically show changelog modal on app load when version changes, displaying only unseen entries.

**Architecture:** Add version comparison utilities, modify ChangelogModal to accept filtered entries, integrate auto-show logic in +page.svelte using $effect and localStorage.

**Tech Stack:** Svelte 5, TypeScript, Vitest (vitest-browser-svelte), LocalStorage API

---

## Task 1: Version Comparison Utility

**Depends on:** None

**Files:**

- Create: `src/lib/utils/versionComparison.ts`
- Create: `src/lib/utils/versionComparison.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/versionComparison.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { isVersionGreaterThan } from './versionComparison';

describe('isVersionGreaterThan', () => {
	test('returns true when major version is greater', () => {
		expect(isVersionGreaterThan('1.0.0', '0.9.9')).toBe(true);
	});

	test('returns false when major version is less', () => {
		expect(isVersionGreaterThan('0.9.9', '1.0.0')).toBe(false);
	});

	test('returns true when major same, minor greater', () => {
		expect(isVersionGreaterThan('0.42.0', '0.29.0')).toBe(true);
	});

	test('returns false when major same, minor less', () => {
		expect(isVersionGreaterThan('0.29.0', '0.42.0')).toBe(false);
	});

	test('returns true when major and minor same, patch greater', () => {
		expect(isVersionGreaterThan('0.42.5', '0.42.3')).toBe(true);
	});

	test('returns false when major and minor same, patch less', () => {
		expect(isVersionGreaterThan('0.42.3', '0.42.5')).toBe(false);
	});

	test('returns false when versions are equal', () => {
		expect(isVersionGreaterThan('0.42.0', '0.42.0')).toBe(false);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- versionComparison.test.ts`

Expected: FAIL with "Cannot find module './versionComparison'"

**Step 3: Write minimal implementation**

Create `src/lib/utils/versionComparison.ts`:

```typescript
export function isVersionGreaterThan(versionA: string, versionB: string): boolean {
	const parseVersion = (v: string) => v.split('.').map(Number);
	const [majorA, minorA, patchA] = parseVersion(versionA);
	const [majorB, minorB, patchB] = parseVersion(versionB);

	if (majorA !== majorB) return majorA > majorB;
	if (minorA !== minorB) return minorA > minorB;
	return patchA > patchB;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- versionComparison.test.ts`

Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add src/lib/utils/versionComparison.ts src/lib/utils/versionComparison.test.ts
git commit -m "feat: add version comparison utility for changelog filtering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Changelog Filtering Utility

**Depends on:** Task 1

**Files:**

- Modify: `src/lib/utils/versionComparison.ts`
- Modify: `src/lib/utils/versionComparison.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/utils/versionComparison.test.ts`:

```typescript
import { getNewChangelogEntries, getPreviousMinorVersion } from './versionComparison';
import type { ChangelogEntry } from '$lib/changelog';

describe('getNewChangelogEntries', () => {
	const mockChangelog: ChangelogEntry[] = [
		{
			version: '0.42.0',
			date: '2026-02-02',
			changes: [{ category: 'new', description: 'Feature A' }]
		},
		{
			version: '0.38.0',
			date: '2026-02-02',
			changes: [{ category: 'fixed', description: 'Bug B' }]
		},
		{
			version: '0.29.0',
			date: '2026-01-31',
			changes: [{ category: 'changed', description: 'Change C' }]
		},
		{
			version: '0.28.0',
			date: '2026-01-30',
			changes: [{ category: 'new', description: 'Feature D' }]
		}
	];

	test('returns entries newer than last seen version', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.29.0');
		expect(result).toHaveLength(2);
		expect(result[0].version).toBe('0.42.0');
		expect(result[1].version).toBe('0.38.0');
	});

	test('returns empty array when no new entries', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.42.0');
		expect(result).toHaveLength(0);
	});

	test('returns all entries when last seen is very old', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.1.0');
		expect(result).toHaveLength(4);
	});
});

describe('getPreviousMinorVersion', () => {
	test('decrements minor version by 1', () => {
		expect(getPreviousMinorVersion('0.42.0')).toBe('0.41.0');
	});

	test('handles version with patch number', () => {
		expect(getPreviousMinorVersion('0.42.5')).toBe('0.41.0');
	});

	test('handles minor version 0', () => {
		expect(getPreviousMinorVersion('0.0.0')).toBe('0.0.0');
	});

	test('handles major version rollover', () => {
		expect(getPreviousMinorVersion('1.0.0')).toBe('0.99.0');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- versionComparison.test.ts`

Expected: FAIL with "getNewChangelogEntries is not a function"

**Step 3: Write minimal implementation**

Add to `src/lib/utils/versionComparison.ts`:

```typescript
import type { ChangelogEntry } from '$lib/changelog';

export function getNewChangelogEntries(
	changelog: ChangelogEntry[],
	lastSeenVersion: string
): ChangelogEntry[] {
	return changelog.filter((entry) => isVersionGreaterThan(entry.version, lastSeenVersion));
}

export function getPreviousMinorVersion(currentVersion: string): string {
	const [major, minor] = currentVersion.split('.').map(Number);

	if (minor === 0) {
		if (major === 0) {
			return '0.0.0';
		}
		return `${major - 1}.99.0`;
	}

	return `${major}.${minor - 1}.0`;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- versionComparison.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/utils/versionComparison.ts src/lib/utils/versionComparison.test.ts
git commit -m "feat: add changelog filtering utilities

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update ChangelogModal Component

**Depends on:** None

**Files:**

- Modify: `src/lib/components/ChangelogModal.svelte:5-10`
- Modify: `src/lib/components/ChangelogModal.svelte:42`

**Step 1: Write the failing test**

Create `src/lib/components/ChangelogModal.svelte.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChangelogModal from './ChangelogModal.svelte';
import type { ChangelogEntry } from '$lib/changelog';

const mockEntries: ChangelogEntry[] = [
	{
		version: '0.42.0',
		date: '2026-02-02',
		changes: [{ category: 'new', description: 'Added feature A' }]
	},
	{
		version: '0.38.0',
		date: '2026-02-01',
		changes: [{ category: 'fixed', description: 'Fixed bug B' }]
	}
];

describe('ChangelogModal', () => {
	test('does not render when show=false', () => {
		const screen = render(ChangelogModal, {
			props: { show: false, onClose: () => {} }
		});
		expect(screen.container.querySelector('.modal-overlay')).toBeNull();
	});

	test('renders changelog heading when show=true', async () => {
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: () => {} }
		});
		await expect.element(screen.getByText('Changelog')).toBeInTheDocument();
	});

	test('renders filtered entries when provided', async () => {
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: () => {}, entries: mockEntries }
		});
		await expect.element(screen.getByText('v0.42.0')).toBeInTheDocument();
		await expect.element(screen.getByText('v0.38.0')).toBeInTheDocument();
		await expect.element(screen.getByText('Added feature A')).toBeInTheDocument();
		await expect.element(screen.getByText('Fixed bug B')).toBeInTheDocument();
	});

	test('renders only provided entries, not all CHANGELOG', async () => {
		const singleEntry: ChangelogEntry[] = [
			{
				version: '0.42.0',
				date: '2026-02-02',
				changes: [{ category: 'new', description: 'Only this entry' }]
			}
		];
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: () => {}, entries: singleEntry }
		});
		await expect.element(screen.getByText('Only this entry')).toBeInTheDocument();
		const versionEntries = screen.container.querySelectorAll('.version-entry');
		expect(versionEntries.length).toBe(1);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- ChangelogModal.svelte.test.ts`

Expected: FAIL - Test with `entries` prop will fail because prop doesn't exist yet

**Step 3: Implement the changes**

Modify `src/lib/components/ChangelogModal.svelte`:

```typescript
<script lang="ts">
	import { Button } from 'bits-ui';
	import { CHANGELOG, type ChangeCategory, type ChangelogEntry } from '$lib/changelog';

	type Props = {
		show: boolean;
		onClose: () => void;
		entries?: ChangelogEntry[];
	};

	let { show, onClose, entries }: Props = $props();

	const displayEntries = $derived(entries ?? CHANGELOG);

	const tagLabel: Record<ChangeCategory, string> = {
		new: 'New',
		changed: 'Changed',
		fixed: 'Fixed'
	};
</script>
```

And update the template at line 42:

```svelte
{#each displayEntries as entry (entry.version)}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- ChangelogModal.svelte.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/components/ChangelogModal.svelte src/lib/components/ChangelogModal.svelte.test.ts
git commit -m "feat: add optional entries prop to ChangelogModal for filtering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: LocalStorage Helper

**Depends on:** None

**Files:**

- Create: `src/lib/utils/changelogStorage.ts`
- Create: `src/lib/utils/changelogStorage.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/changelogStorage.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { getLastSeenVersion, setLastSeenVersion, STORAGE_KEY } from './changelogStorage';

describe('changelogStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	test('getLastSeenVersion returns null when no version stored', () => {
		expect(getLastSeenVersion()).toBeNull();
	});

	test('getLastSeenVersion returns stored version', () => {
		localStorage.setItem(STORAGE_KEY, '0.42.0');
		expect(getLastSeenVersion()).toBe('0.42.0');
	});

	test('setLastSeenVersion stores version in localStorage', () => {
		setLastSeenVersion('0.42.0');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('0.42.0');
	});

	test('setLastSeenVersion overwrites existing version', () => {
		localStorage.setItem(STORAGE_KEY, '0.29.0');
		setLastSeenVersion('0.42.0');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('0.42.0');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- changelogStorage.test.ts`

Expected: FAIL with "Cannot find module './changelogStorage'"

**Step 3: Write minimal implementation**

Create `src/lib/utils/changelogStorage.ts`:

```typescript
export const STORAGE_KEY = 'lastSeenChangelogVersion';

export function getLastSeenVersion(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(STORAGE_KEY);
}

export function setLastSeenVersion(version: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, version);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- changelogStorage.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/utils/changelogStorage.ts src/lib/utils/changelogStorage.test.ts
git commit -m "feat: add localStorage helpers for changelog version tracking

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Integration - Auto-Show Logic in +page.svelte

**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**

- Modify: `src/routes/+page.svelte:1-22`
- Modify: `src/routes/+page.svelte:273`

**Step 1: Add imports and state**

At the top of `src/routes/+page.svelte`, add these imports after the existing ones (around line 7):

```typescript
import { CHANGELOG, type ChangelogEntry } from '$lib/changelog';
import { getLastSeenVersion, setLastSeenVersion } from '$lib/utils/changelogStorage';
import { getNewChangelogEntries, getPreviousMinorVersion } from '$lib/utils/versionComparison';
```

Modify the changelog state (around line 20):

```typescript
let showChangelogModal = $state(false);
let changelogEntries = $state<ChangelogEntry[]>(CHANGELOG);
```

**Step 2: Add auto-show logic with $effect**

Add this code block after the state declarations (around line 23, before the UpgradeSlot interface):

```typescript
// Auto-show changelog on version change
$effect(() => {
	if (typeof window === 'undefined') return;

	const lastSeenVersion = getLastSeenVersion();
	const currentVersion = VERSION;

	if (!lastSeenVersion) {
		// New user: show only current version
		const previousMinor = getPreviousMinorVersion(currentVersion);
		const newEntries = getNewChangelogEntries(CHANGELOG, previousMinor);
		if (newEntries.length > 0) {
			changelogEntries = newEntries;
			showChangelogModal = true;
		}
	} else if (lastSeenVersion !== currentVersion) {
		// Returning user: show all new versions since last seen
		const newEntries = getNewChangelogEntries(CHANGELOG, lastSeenVersion);
		if (newEntries.length > 0) {
			changelogEntries = newEntries;
			showChangelogModal = true;
		}
	}
});
```

**Step 3: Update close handler**

Find the ChangelogModal component (around line 273) and update it:

```svelte
<ChangelogModal
	show={showChangelogModal}
	entries={changelogEntries}
	onClose={() => {
		showChangelogModal = false;
		setLastSeenVersion(VERSION);
		changelogEntries = CHANGELOG;
	}}
/>
```

**Step 4: Update manual open handler**

Find where `onOpenChangelog` is defined (around line 278) and update it:

```typescript
onOpenChangelog={() => {
	changelogEntries = CHANGELOG;
	showChangelogModal = true;
}}
```

**Step 5: Manual verification**

Since this involves browser behavior, test manually:

1. Run: `npm run dev`
2. Open browser, clear localStorage
3. Load app - changelog modal should appear with only v0.42.0
4. Close modal
5. Check localStorage for `lastSeenChangelogVersion` = "0.42.0"
6. Refresh page - no modal should appear
7. Manually set localStorage to "0.29.0" via dev tools
8. Refresh - modal should show entries from v0.30.0 onwards
9. Click manual changelog button - should show full history

Expected: All behaviors work as described in design doc

**Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: integrate auto-show changelog on version change

Auto-displays changelog modal on app load when version changes. New users
see only current version, returning users see all entries since last visit.
Persists last seen version in localStorage.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Changelog with Feature Entry

**Depends on:** Task 5

**Files:**

- Modify: `src/lib/changelog.ts:14-25`

**Step 1: Add changelog entry**

At the top of the CHANGELOG array in `src/lib/changelog.ts`, add this entry:

```typescript
export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '0.43.0',
		date: '2026-02-03',
		changes: [
			{
				category: 'new',
				description:
					'Added automatic changelog notifications showing new entries on version updates'
			}
		]
	},
	{
		version: '0.42.0',
		date: '2026-02-02',
		changes: [
			// ... existing entries
```

**Step 2: Verify formatting**

Run: `npm run format`

Expected: No changes needed (already formatted correctly)

**Step 3: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add changelog entry for auto-changelog feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Testing & Verification

After completing all tasks, perform end-to-end verification:

1. **New user flow:**
   - Clear localStorage
   - Load app
   - Verify modal shows only current version entries
   - Close modal
   - Verify `lastSeenChangelogVersion` in localStorage matches current VERSION

2. **Version bump flow:**
   - Set localStorage `lastSeenChangelogVersion` to "0.29.0"
   - Refresh page
   - Verify modal shows entries from v0.30.0 through current
   - Close modal
   - Verify storage updated to current VERSION

3. **No change flow:**
   - Refresh page (with current version already in storage)
   - Verify modal does NOT auto-show
   - Click manual changelog button
   - Verify full history appears

4. **Manual view:**
   - With or without auto-show, click changelog button
   - Verify full CHANGELOG appears
   - Close
   - Verify storage is NOT updated (only auto-show updates storage)

**Final commit:**

```bash
git add -A
git commit -m "test: verify auto-changelog end-to-end flows

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```
