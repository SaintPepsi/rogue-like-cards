# bits-ui Component Toolkit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use coca-wits:executing-plans to implement this plan task-by-task.

**Goal:** Establish 6 thin wrapper components around bits-ui primitives in `src/lib/components/ui/`, then migrate all existing hand-rolled UI to use them.

**Architecture:** Each wrapper bakes in the project's visual defaults (dark theme, border-radius, colors) while exposing props for the variations that actually exist. Consumers import from `$lib/components/ui/` instead of `bits-ui` directly for these patterns.

**Tech Stack:** Svelte 5 (runes), bits-ui v2.15.4, Tailwind CSS v4

---

### Task 1: Create Separator wrapper

**Depends on:** None

**Files:**

- Create: `src/lib/components/ui/Separator.svelte`

**Step 1: Create the component**

```svelte
<!-- src/lib/components/ui/Separator.svelte -->
<script lang="ts">
	import { Separator } from 'bits-ui';

	type Props = {
		opacity?: number;
		margin?: string;
	};

	let { opacity = 0.06, margin = '8px 4px' }: Props = $props();
</script>

<Separator.Root
	decorative
	class="w-full"
	style:height="1px"
	style:background="rgba(255, 255, 255, {opacity})"
	style:margin
/>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to Separator.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/Separator.svelte
git commit -m "feat: add Separator UI wrapper around bits-ui Separator"
```

---

### Task 2: Create Toggle wrapper

**Depends on:** None

**Files:**

- Create: `src/lib/components/ui/Toggle.svelte`

**Step 1: Create the component**

```svelte
<!-- src/lib/components/ui/Toggle.svelte -->
<script lang="ts">
	import { Toggle } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		pressed: boolean;
		onPressedChange: (pressed: boolean) => void;
		disabled?: boolean;
		children: Snippet;
	};

	let { pressed, onPressedChange, disabled = false, children }: Props = $props();
</script>

<Toggle.Root
	{pressed}
	{onPressedChange}
	{disabled}
	class="border border-white/[0.08] rounded-lg px-2.5 py-1 text-[1.1rem] cursor-pointer transition-[background] duration-150
		{pressed
		? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]'
		: 'bg-white/5 hover:bg-white/10'}"
>
	{@render children()}
</Toggle.Root>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to Toggle.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/Toggle.svelte
git commit -m "feat: add Toggle UI wrapper around bits-ui Toggle"
```

---

### Task 3: Create Progress wrapper

**Depends on:** None

**Files:**

- Create: `src/lib/components/ui/Progress.svelte`

**Step 1: Create the component**

```svelte
<!-- src/lib/components/ui/Progress.svelte -->
<script lang="ts">
	import { Progress } from 'bits-ui';

	type Props = {
		value: number;
		max: number;
		variant?: 'normal' | 'boss';
	};

	let { value, max, variant = 'normal' }: Props = $props();

	const percentage = $derived(max > 0 ? (value / max) * 100 : 0);
</script>

<Progress.Root
	{value}
	{max}
	min={0}
	class="overflow-hidden rounded-lg {variant === 'boss'
		? 'w-[180px] h-5 border-2 border-[#dc2626]'
		: 'w-[150px] h-4'}"
	style:background="rgba(0, 0, 0, 0.5)"
>
	<div
		class="h-full transition-[width] duration-200 ease-out"
		style:width="{percentage}%"
		style:background="linear-gradient(90deg, {variant === 'boss' ? '#dc2626' : '#ef4444'}, #f87171)"
	></div>
</Progress.Root>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to Progress.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/Progress.svelte
git commit -m "feat: add Progress UI wrapper around bits-ui Progress"
```

---

### Task 4: Create Slider wrapper

**Depends on:** None

**Files:**

- Create: `src/lib/components/ui/Slider.svelte`

**Step 1: Create the component**

bits-ui Slider uses `value` as a number (for `type="single"`), with `bind:value` or `onValueChange`. The `step` prop controls increments. We wrap it with a label + formatted value display.

```svelte
<!-- src/lib/components/ui/Slider.svelte -->
<script lang="ts">
	import { Slider } from 'bits-ui';

	type Props = {
		label: string;
		value: number;
		onValueChange: (value: number) => void;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		formatValue?: (value: number) => string;
	};

	let {
		label,
		value,
		onValueChange,
		min = 0,
		max = 1,
		step = 0.01,
		disabled = false,
		formatValue = (v: number) => `${Math.round(v * 100)}%`
	}: Props = $props();
</script>

<label class="flex items-center gap-2.5 px-1">
	<span class="w-10 text-[0.85rem] text-white/70">{label}</span>
	<Slider.Root
		type="single"
		{value}
		{min}
		{max}
		{step}
		{disabled}
		onValueChange={(v) => onValueChange(v)}
		class="relative flex h-4 flex-1 cursor-pointer touch-none items-center
			{disabled ? 'opacity-30' : ''}"
	>
		<span class="relative h-1 w-full overflow-hidden rounded-sm bg-white/15">
			<Slider.Range class="absolute h-full bg-white/40" />
		</span>
		<Slider.Thumb index={0} class="block h-4 w-4 rounded-full bg-white shadow cursor-pointer" />
	</Slider.Root>
	<span class="w-9 text-right text-[0.8rem] text-white/40 tabular-nums">{formatValue(value)}</span>
</label>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to Slider.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/Slider.svelte
git commit -m "feat: add Slider UI wrapper around bits-ui Slider"
```

---

### Task 5: Create ScrollArea wrapper

**Depends on:** None

**Files:**

- Create: `src/lib/components/ui/ScrollArea.svelte`

**Step 1: Create the component**

```svelte
<!-- src/lib/components/ui/ScrollArea.svelte -->
<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		padding?: string;
		children: Snippet;
	};

	let { padding = '24px', children }: Props = $props();
</script>

<ScrollArea.Root type="hover" class="overflow-hidden">
	<ScrollArea.Viewport class="h-full w-full" style:padding>
		{@render children()}
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar
		orientation="vertical"
		class="flex w-2 touch-none select-none p-px transition-opacity duration-200 data-[state=hidden]:opacity-0"
	>
		<ScrollArea.Thumb class="relative flex-1 rounded-full bg-white/15" />
	</ScrollArea.Scrollbar>
</ScrollArea.Root>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to ScrollArea.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/ScrollArea.svelte
git commit -m "feat: add ScrollArea UI wrapper around bits-ui ScrollArea"
```

---

### Task 6: Create Dialog wrapper

**Depends on:** Task 1 (uses Separator for header border)

**Files:**

- Create: `src/lib/components/ui/Dialog.svelte`

**Step 1: Create the component**

The Dialog wrapper absorbs the repeated overlay/container/header/close-button/escape/focus-trap pattern from all 7 modals. Key bits-ui features:

- `Dialog.Content` has `escapeKeydownBehavior` and `interactOutsideBehavior` to control dismissal
- `Dialog.Portal` handles z-index stacking
- `Dialog.Overlay` provides the backdrop
- `Dialog.Title` provides accessible heading

For non-dismissible modals (game-critical), we set both behaviors to `'ignore'` and hide the close button.

For modals that don't have a header (ChestLoot, GameOver, LevelUp, Shop), we use `showHeader={false}` and provide a visually-hidden `Dialog.Title` for accessibility.

```svelte
<!-- src/lib/components/ui/Dialog.svelte -->
<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open: boolean;
		onClose?: () => void;
		maxWidth?: string;
		dismissible?: boolean;
		title: string;
		showHeader?: boolean;
		children: Snippet;
		/** Extra classes applied to the content container */
		contentClass?: string;
		/** Extra classes applied to the overlay */
		overlayClass?: string;
	};

	let {
		open,
		onClose,
		maxWidth = '90vw',
		dismissible = true,
		title,
		showHeader = true,
		children,
		contentClass = '',
		overlayClass = ''
	}: Props = $props();

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && onClose) {
			onClose();
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-100 flex items-center justify-center bg-black/85 {overlayClass}"
		/>
		<Dialog.Content
			class="fixed inset-0 z-100 flex items-center justify-center p-5 outline-none"
			escapeKeydownBehavior={dismissible ? 'close' : 'ignore'}
			interactOutsideBehavior={dismissible ? 'close' : 'ignore'}
			trapFocus
			preventScroll
		>
			<div
				class="bg-[#1a1a2e] rounded-2xl w-full flex flex-col overflow-hidden {contentClass}"
				style:max-width={maxWidth}
				onclick={(e) => e.stopPropagation()}
			>
				{#if showHeader}
					<div class="flex items-center gap-4 px-6 py-5 border-b border-white/10">
						<Dialog.Title class="m-0 text-[1.3rem] text-white flex-1">{title}</Dialog.Title>
						{#if dismissible && onClose}
							<Dialog.Close
								class="bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
							>
								&times;
							</Dialog.Close>
						{/if}
					</div>
				{:else}
					<Dialog.Title class="sr-only">{title}</Dialog.Title>
				{/if}
				{@render children()}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
```

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors related to Dialog.svelte

**Step 3: Commit**

```bash
git add src/lib/components/ui/Dialog.svelte
git commit -m "feat: add Dialog UI wrapper around bits-ui Dialog"
```

---

### Task 7: Migrate SettingsModal to Dialog, Slider, Toggle, Separator

**Depends on:** Task 1, Task 2, Task 4, Task 6

**Files:**

- Modify: `src/lib/components/SettingsModal.svelte`

**Step 1: Rewrite SettingsModal**

Replace the entire modal shell (overlay, container, header, escape handler) with `<Dialog>`. Replace the 3 volume sliders with `<Slider>`. Replace the mute button with `<Toggle>`. Replace dividers with `<Separator>`.

The component script keeps: `handleReset`, `handleClose`, `handleChangelog`, `showResetConfirm` state. The audio section content, changelog button, and reset button markup stay but lose their wrapping modal boilerplate.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay` div, `.modal` div, `.modal-header` div, escape handler, stopPropagation
- Add: `<Dialog open={show} onClose={handleClose} maxWidth="400px" title="Settings">`
- Remove: 3x `<label class="volume-slider">` blocks with `<input type="range">`
- Add: 3x `<Slider label="SFX" value={audioManager.sfxVolume} onValueChange={(v) => audioManager.setSfxVolume(v)} disabled={audioManager.muted} />`
- Remove: `<Button.Root class="mute-btn ...">` for mute
- Add: `<Toggle pressed={audioManager.muted} onPressedChange={() => audioManager.toggleMute()}>`
- Remove: `<div class="settings-divider">` (2x)
- Add: `<Separator />` (2x)
- Remove CSS: `.modal-overlay`, `.modal`, `.modal-header`, `.modal-header h2`, `.volume-slider`, `.slider-label`, `.volume-slider input[type='range']`, `.volume-slider input[type='range']::-webkit-slider-thumb`, `.volume-slider input[type='range']:disabled`, `.slider-value`, `.settings-divider`, `:global(.mute-btn)`, `:global(.mute-btn:hover)`, `:global(.mute-btn.muted)`

**Step 2: Verify it builds**

Run: `npm run check`
Expected: No errors

**Step 3: Visually verify in browser**

Run: `npm run dev`
Open settings modal, check:

- Modal opens/closes correctly
- Escape key closes it
- Backdrop click closes it
- Volume sliders work (drag, value updates)
- Mute toggle works (pressed state, visual change)
- Separators visible between sections
- Changelog and Reset buttons still work

**Step 4: Commit**

```bash
git add src/lib/components/SettingsModal.svelte
git commit -m "refactor: migrate SettingsModal to Dialog, Slider, Toggle, Separator wrappers"
```

---

### Task 8: Migrate ChangelogModal to Dialog and ScrollArea

**Depends on:** Task 5, Task 6

**Files:**

- Modify: `src/lib/components/ChangelogModal.svelte`

**Step 1: Rewrite ChangelogModal**

Replace modal shell with `<Dialog open={show} onClose={onClose} maxWidth="600px" title="Changelog">`. The `Dialog` wrapper handles the header with title + close button, so remove the manual header markup.

Wrap the changelog entries list in `<ScrollArea>`. The modal needs `max-height: 80vh` on the Dialog content — pass this via `contentClass="max-h-[80vh]"`.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay`, `.modal`, `.modal-header`, close Button.Root, escape handler, stopPropagation
- Add: `<Dialog open={show} {onClose} maxWidth="600px" title="Changelog" contentClass="max-h-[80vh]">`
- Remove: `<div class="modal-content">` with `overflow-y: auto`
- Add: `<ScrollArea>` wrapping the `{#each CHANGELOG ...}` block
- Note: The title color in ChangelogModal is `#fbbf24` (gold) vs default white. Handle this by providing a custom header — either extend Dialog with a `titleClass` prop, or skip `showHeader` and render a custom header inside the body. The simpler approach: add an optional `titleClass` prop to Dialog.
- Remove CSS: `.modal-overlay`, `.modal`, `.modal-header`, `.modal-header h2`, `.modal-content`
- Keep CSS: `.version-entry`, `.version-date`, `.tag`, `.tag-*`, `.change-description`

**Step 2: Update Dialog.svelte to accept optional `titleClass` prop**

Add `titleClass?: string` prop to Dialog, defaulting to `'text-white'`. Apply it to Dialog.Title. This avoids needing custom headers for simple color overrides.

**Step 3: Verify it builds**

Run: `npm run check`
Expected: No errors

**Step 4: Visually verify in browser**

Run: `npm run dev`
Open changelog modal, check:

- Scrolling works with styled scrollbar thumb
- Title appears in gold
- Close button works
- Escape key closes it
- Content is readable and properly padded

**Step 5: Commit**

```bash
git add src/lib/components/ChangelogModal.svelte src/lib/components/ui/Dialog.svelte
git commit -m "refactor: migrate ChangelogModal to Dialog and ScrollArea wrappers"
```

---

### Task 9: Migrate UpgradesModal to Dialog and ScrollArea

**Depends on:** Task 5, Task 6, Task 8 (needs titleClass from Task 8)

**Files:**

- Modify: `src/lib/components/UpgradesModal.svelte`

**Step 1: Rewrite UpgradesModal**

Replace modal shell with `<Dialog open={show} {onClose} maxWidth="900px" title="Upgrades Collection" titleClass="text-[#fbbf24]" contentClass="max-h-[80vh]">`.

The UpgradesModal header has extra content: the progress counter `{unlockedCount}/{totalCount} Discovered`. To handle this, use `showHeader={false}` and render a custom header inside the dialog body that includes both the title and the progress text. Or, add a `headerExtra` snippet prop to Dialog.

Simpler approach: add an optional `headerChildren` snippet prop to Dialog that renders additional content in the header row (after title, before close button). This is more reusable than `showHeader={false}` + manual header.

Wrap the upgrades grid in `<ScrollArea>`.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay`, `.modal`, `.modal-header`, close Button.Root, escape handler, stopPropagation
- Add: `<Dialog>` with headerChildren snippet for progress text
- Remove: `<div class="modal-content">` with `overflow-y: auto`
- Add: `<ScrollArea>` wrapping the upgrades grid
- Remove CSS: `.modal-overlay`, `.modal`, `.modal-header`, `.modal-header h2`, `.progress`, `.modal-content`
- Keep CSS: `.upgrades-grid`, `.upgrade-wrapper`, `.locked`, `.lock-overlay`, `.lock-icon`, media query

**Step 2: Update Dialog.svelte to accept optional `headerChildren` snippet**

Add `headerChildren?: Snippet` prop. Render it in the header between the title and close button.

**Step 3: Verify it builds and visually verify**

Run: `npm run check && npm run dev`
Check: Modal opens, grid renders, scrolling works, progress text shows, close/escape work.

**Step 4: Commit**

```bash
git add src/lib/components/UpgradesModal.svelte src/lib/components/ui/Dialog.svelte
git commit -m "refactor: migrate UpgradesModal to Dialog and ScrollArea wrappers"
```

---

### Task 10: Migrate GameOverModal to Dialog

**Depends on:** Task 6

**Files:**

- Modify: `src/lib/components/GameOverModal.svelte`

**Step 1: Rewrite GameOverModal**

Replace modal shell with `<Dialog open={show} title="Game Over" showHeader={false} dismissible={false}>`.

This modal has no close button, no escape, no backdrop dismiss. The `showHeader={false}` means the title is visually hidden (sr-only) but accessible.

The body content (h2, stats, buttons) stays as-is inside the Dialog children.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay` div, `.modal` div
- Add: `<Dialog open={show} title="Game Over" showHeader={false} dismissible={false} contentClass="text-center">`
- Note: The existing `.modal` has `padding: 32px` and `text-align: center`. Pass padding via the body div or contentClass.
- Remove CSS: `.modal-overlay`, `.modal`
- Keep CSS: `.game-over h2`, `.game-over-stats`, `.gold-display`, `.gold-amount`, `.button-row`, `.modal p`

**Step 2: Verify and commit**

Run: `npm run check && npm run dev`
Check: Game over screen shows after boss defeat, buttons work, no dismiss on escape/backdrop.

```bash
git add src/lib/components/GameOverModal.svelte
git commit -m "refactor: migrate GameOverModal to Dialog wrapper"
```

---

### Task 11: Migrate ChestLootModal to Dialog

**Depends on:** Task 6

**Files:**

- Modify: `src/lib/components/ChestLootModal.svelte`

**Step 1: Rewrite ChestLootModal**

Replace modal shell with `<Dialog open={show} title="Treasure Found" showHeader={false} dismissible={false}>`.

This modal has exit animations (`.exiting` class on overlay that makes it transparent + `.modal-exit` keyframe). The Dialog wrapper doesn't handle exit animations, so the `exiting` class needs to be applied to the Dialog's overlay. Pass `overlayClass={exiting ? 'exiting' : ''}` and keep the exit animation CSS locally.

However, bits-ui Dialog controls its own open/close. The `exiting` state is a parent-driven animation before the modal actually closes. This pattern needs the modal to stay open during the exit animation. The current implementation keeps `show=true` while `exiting=true`, then sets `show=false` after the animation.

This works with Dialog because `open` stays `true` during the exit animation. The local CSS applies the animation, and the parent sets `open=false` after the animation completes.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay` div, `.modal` div
- Add: `<Dialog open={show} title="Treasure Found" showHeader={false} dismissible={false} overlayClass={exiting ? '!bg-transparent pointer-events-none' : ''} contentClass={exiting ? 'animate-modal-exit' : ''}>` — but the animation is on the inner `.modal` div, not the content container. Keep a wrapper div inside Dialog children that handles the exiting animation.
- Simpler approach: keep the `exiting` class on an inner wrapper div inside the Dialog body. Dialog provides the overlay + focus trap + portal. The exit animation plays on the inner content.
- Remove CSS: `.modal-overlay` (but keep `.modal-overlay.exiting` rules adapted to Dialog's overlay)
- Keep CSS: `.modal-exit` keyframe, `.selecting`, `.panel-pulse`, card flip CSS, all card-related styles

**Step 2: Verify and commit**

Run: `npm run check && npm run dev`
Check: Chest modal appears, cards flip, selection works, exit animation plays.

```bash
git add src/lib/components/ChestLootModal.svelte
git commit -m "refactor: migrate ChestLootModal to Dialog wrapper"
```

---

### Task 12: Migrate LevelUpModal to Dialog

**Depends on:** Task 6

**Files:**

- Modify: `src/lib/components/LevelUpModal.svelte`

**Step 1: Rewrite LevelUpModal**

Same pattern as ChestLootModal (Task 11). Replace modal shell with `<Dialog open={show} title="Level Up" showHeader={false} dismissible={false}>`. Handle exit animation on inner wrapper.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay` div, `.modal` div
- Add: `<Dialog>` with inner wrapper for exit animation
- Remove CSS: `.modal-overlay`
- Keep CSS: `.modal-exit`, `.selecting`, `.panel-pulse`, `.pending-badge`, card flip CSS

**Step 2: Verify and commit**

Run: `npm run check && npm run dev`
Check: Level up modal appears on level up, cards flip, selection works, exit animation, pending badge shows.

```bash
git add src/lib/components/LevelUpModal.svelte
git commit -m "refactor: migrate LevelUpModal to Dialog wrapper"
```

---

### Task 13: Migrate ShopModal to Dialog

**Depends on:** Task 6

**Files:**

- Modify: `src/lib/components/ShopModal.svelte`

**Step 1: Rewrite ShopModal**

Replace modal shell with `<Dialog open={show} title="Card Shop" showHeader={false} dismissible={false}>`.

ShopModal has no exit animation (unlike ChestLoot/LevelUp), so this is straightforward — just swap the shell.

Key changes:

- Remove: `{#if show}` block, `.modal-overlay` div, `.modal` div
- Add: `<Dialog open={show} title="Card Shop" showHeader={false} dismissible={false}>`
- Remove CSS: `.modal-overlay`, `.modal` (base styles)
- Keep CSS: `.selecting`, `.panel-pulse`, `.cards-fading`, card flip CSS, `.buy-label`, `.reroll-*`, `.button-row`, `.carousel-fade`

**Step 2: Verify and commit**

Run: `npm run check && npm run dev`
Check: Shop opens from game over screen, cards display, buy/reroll work, back/play again work.

```bash
git add src/lib/components/ShopModal.svelte
git commit -m "refactor: migrate ShopModal to Dialog wrapper"
```

---

### Task 14: Migrate BattleArea health bar to Progress

**Depends on:** Task 3

**Files:**

- Modify: `src/lib/components/BattleArea.svelte`

**Step 1: Replace health bar markup**

Replace lines 83-85 (the `.health-bar` and `.health-fill` divs) with `<Progress>`:

```svelte
<Progress value={enemyHealth} max={enemyMaxHealth} variant={isBoss ? 'boss' : 'normal'} />
```

Import: `import Progress from './ui/Progress.svelte';`

Remove CSS: `.health-bar`, `.health-bar.boss-bar`, `.health-fill`, `.health-bar.boss-bar .health-fill`
Keep CSS: `.health-text`

**Step 2: Verify and commit**

Run: `npm run check && npm run dev`
Check: Health bar renders, updates on hit, boss variant has red border, transitions smooth.

```bash
git add src/lib/components/BattleArea.svelte
git commit -m "refactor: migrate BattleArea health bar to Progress wrapper"
```

---

### Task 15: Final build verification and cleanup

**Depends on:** Tasks 7-14

**Files:**

- Check all modified files for unused imports

**Step 1: Full type check**

Run: `npm run check`
Expected: No errors

**Step 2: Full build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run existing tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Manual smoke test**

Run: `npm run dev`
Test full game flow:

- Start game, attack enemies, see health bar (Progress)
- Level up, see card modal (Dialog), select card
- Open settings (Dialog + Slider + Toggle + Separator)
- Open changelog (Dialog + ScrollArea)
- Open upgrades collection (Dialog + ScrollArea)
- Defeat boss, see game over (Dialog)
- Open shop (Dialog), buy cards, reroll
- Check chest loot modal works

**Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore: clean up unused imports after bits-ui toolkit migration"
```
