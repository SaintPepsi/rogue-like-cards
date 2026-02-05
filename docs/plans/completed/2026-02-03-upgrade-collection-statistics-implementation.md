# Upgrade Collection Statistics Implementation Plan

## Overview

Add three statistics counters to each upgrade card in the collection view:

- **Shop Purchases** 🛒 - Times bought from shop (persistent, already exists)
- **Run Picks** ▶ - Times picked this run from level-ups/chests (session-only)
- **Lifetime Picks** 🏆 - Total times picked across all runs (persistent)

Display format: Small badge pills on each unlocked card (e.g., "🛒 5 • ▶ 2 • 🏆 23")

## Key Design Decisions

1. **Separate counters**: Shop purchases and run picks are independent (shop doesn't increment run counter)
2. **Lifetime accumulation**: On game over, merge current run picks into lifetime totals, then reset run counter
3. **Conditional display**: Only show badges with values > 0 to avoid clutter
4. **Data location**:
   - `runPickCounts` in gameState.svelte.ts (session state, Map)
   - `lifetimePickCounts` in shop.svelte.ts (persistent state, SvelteMap)
   - Follows existing pattern of shop handling persistent upgrade data
5. **Backwards compatibility**: Old saves without `lifetimePickCounts` default to empty object

## Critical Files

| File                                      | Purpose                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `src/lib/stores/gameState.svelte.ts`      | Add runPickCounts Map, increment on select, merge on game over |
| `src/lib/stores/shop.svelte.ts`           | Add lifetimePickCounts SvelteMap, persistence, merge method    |
| `src/lib/stores/persistence.svelte.ts`    | Add lifetimePickCounts field to PersistentSaveData             |
| `src/lib/components/UpgradeCard.svelte`   | Add props, stats bar markup, pill badge styles                 |
| `src/lib/components/UpgradesModal.svelte` | Pass statistics data to UpgradeCard components                 |
| `src/routes/+page.svelte`                 | Wire up stats data to UpgradesModal                            |

## Implementation Steps

### Phase 1: Data Layer (gameState.svelte.ts)

1. **Add state** after line 37 (near `unlockedUpgrades`):

   ```typescript
   let runPickCounts = $state<Map<string, number>>(new Map());
   ```

2. **Increment on selection** in `selectUpgrade()` after line 294:

   ```typescript
   // Track run pick statistics
   const currentCount = runPickCounts.get(upgrade.id) ?? 0;
   runPickCounts.set(upgrade.id, currentCount + 1);
   ```

3. **Merge on game over** in `handleBossExpired()` after line 113:

   ```typescript
   // Merge run pick counts into lifetime stats
   shop.mergeRunPickCounts(runPickCounts);
   runPickCounts.clear();
   ```

4. **Reset on new game** in `resetGame()` after line 418:

   ```typescript
   runPickCounts.clear();
   ```

5. **Add getters** to return object after line 583:
   ```typescript
   getShopPurchaseCounts: () => shop.purchasedUpgradeCounts,
   getLifetimePickCounts: () => shop.lifetimePickCounts,
   getRunPickCounts: () => runPickCounts
   ```

### Phase 2: Persistent Storage (shop.svelte.ts)

1. **Add state** after line 18:

   ```typescript
   let lifetimePickCounts = new SvelteMap<string, number>();
   ```

2. **Add merge method** (call from gameState.handleBossExpired):

   ```typescript
   mergeRunPickCounts: (runCounts: Map<string, number>) => {
   	for (const [id, count] of runCounts) {
   		const prev = lifetimePickCounts.get(id) ?? 0;
   		lifetimePickCounts = new SvelteMap([...lifetimePickCounts, [id, prev + count]]);
   	}
   	save();
   };
   ```

3. **Update save()** at line 98-106, add after line 102:

   ```typescript
   lifetimePickCounts: Object.fromEntries(lifetimePickCounts),
   ```

4. **Update load()** at line 108-127, add after line 114:

   ```typescript
   lifetimePickCounts = new SvelteMap(Object.entries(data.lifetimePickCounts || {}));
   ```

5. **Update fullReset()** at line 139-146, add after line 141:

   ```typescript
   lifetimePickCounts = new SvelteMap();
   ```

6. **Add getter** to return object after line 180:
   ```typescript
   get lifetimePickCounts() {
     return lifetimePickCounts;
   }
   ```

### Phase 3: Persistence Types (persistence.svelte.ts)

**Update PersistentSaveData interface** at line 30-36:

```typescript
export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeCounts: Record<string, number>;
	lifetimePickCounts?: Record<string, number>; // NEW: optional for backwards compat
	executeCapBonus: number;
	shopChoiceIds?: string[];
	rerollCost?: number;
}
```

### Phase 4: UI Component (UpgradeCard.svelte)

1. **Extend Props** at line 15-21:

   ```typescript
   type Props = {
   	title: string;
   	image?: string;
   	rarity?: Rarity;
   	modifiers?: StatModifier[];
   	currentStats?: Partial<PlayerStats>;
   	shopPurchases?: number;
   	runPicks?: number;
   	lifetimePicks?: number;
   };
   ```

2. **Extract props** at line 23-29 (add to destructuring):

   ```typescript
   ((shopPurchases = 0), (runPicks = 0), (lifetimePicks = 0));
   ```

3. **Add derived** after line 55:

   ```typescript
   const showStatsBar = $derived(shopPurchases > 0 || runPicks > 0 || lifetimePicks > 0);
   ```

4. **Add stats bar markup** after `<h2>{title}</h2>` at line 67:

   ```svelte
   {#if showStatsBar}
   	<div class="stats-bar">
   		{#if shopPurchases > 0}
   			<div class="stat-badge shop" title="Shop purchases">
   				<span class="badge-icon">🛒</span>
   				<span class="badge-count">{shopPurchases}</span>
   			</div>
   		{/if}
   		{#if runPicks > 0}
   			<div class="stat-badge run" title="Picks this run">
   				<span class="badge-icon">▶</span>
   				<span class="badge-count">{runPicks}</span>
   			</div>
   		{/if}
   		{#if lifetimePicks > 0}
   			<div class="stat-badge lifetime" title="Total lifetime picks">
   				<span class="badge-icon">🏆</span>
   				<span class="badge-count">{lifetimePicks}</span>
   			</div>
   		{/if}
   	</div>
   {/if}
   ```

5. **Add styles** at end of `<style>` block after line 209:

   ```scss
   .stats-bar {
   	display: flex;
   	gap: 4px;
   	margin: 8px 0;
   	justify-content: center;
   }

   .stat-badge {
   	display: flex;
   	align-items: center;
   	gap: 3px;
   	padding: 3px 8px;
   	border-radius: 12px;
   	font-size: 0.75rem;
   	font-weight: 600;

   	.badge-icon {
   		font-size: 0.85rem;
   	}

   	.badge-count {
   		line-height: 1;
   	}
   }

   .stat-badge.shop {
   	background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(139, 92, 246, 0.25));
   	border: 1px solid rgba(168, 85, 247, 0.4);
   	color: #d8b4fe;
   }

   .stat-badge.run {
   	background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(22, 163, 74, 0.25));
   	border: 1px solid rgba(34, 197, 94, 0.4);
   	color: #86efac;
   }

   .stat-badge.lifetime {
   	background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.25));
   	border: 1px solid rgba(251, 191, 36, 0.4);
   	color: #fde68a;
   }
   ```

### Phase 5: Component Integration (UpgradesModal.svelte)

1. **Update Props** at line 6-10:

   ```typescript
   type Props = {
   	show: boolean;
   	unlockedUpgrades: Set<string>;
   	onClose: () => void;
   	shopPurchaseCounts: Map<string, number>;
   	lifetimePickCounts: Map<string, number>;
   };

   let { show, unlockedUpgrades, onClose, shopPurchaseCounts, lifetimePickCounts }: Props =
   	$props();
   ```

2. **Pass stats to UpgradeCard** at line 46-51:
   ```svelte
   <UpgradeCard
   	title={isUnlocked ? upgrade.title : '???'}
   	rarity={upgrade.rarity}
   	image={upgrade.image}
   	modifiers={isUnlocked ? upgrade.modifiers : []}
   	shopPurchases={isUnlocked ? (shopPurchaseCounts.get(upgrade.id) ?? 0) : 0}
   	lifetimePicks={isUnlocked ? (lifetimePickCounts.get(upgrade.id) ?? 0) : 0}
   />
   ```

### Phase 6: Main App Integration (+page.svelte)

**Update UpgradesModal binding** at line 296-300:

```svelte
<UpgradesModal
	show={showUpgradesModal}
	unlockedUpgrades={gameState.unlockedUpgrades}
	shopPurchaseCounts={gameState.getShopPurchaseCounts()}
	lifetimePickCounts={gameState.getLifetimePickCounts()}
	onClose={() => (showUpgradesModal = false)}
/>
```

## Edge Cases Handled

1. **Old saves**: `lifetimePickCounts?` optional field defaults to empty object on load
2. **Shop-only cards**: Only show 🛒 badge (execute cap, gold per kill)
3. **Multiple picks same upgrade**: Map accumulates correctly
4. **Shop purchase during run**: Shop and run counters independent
5. **Give up mid-run**: Merge still happens in `handleBossExpired()`

## Verification Steps

### Manual Testing Checklist

1. **Start new game**: All counters should be 0
2. **Pick upgrade from level-up**: Run counter increments (e.g., ▶ 1)
3. **Pick same upgrade again**: Run counter increments (e.g., ▶ 2)
4. **Open collection modal**: Verify run counter shows on unlocked card
5. **Die/game over**:
   - Gold deposited to shop
   - Lifetime counter should now show (e.g., 🏆 2)
   - Run counter reset to 0
6. **Start new run**: Verify run counter is 0, lifetime persists
7. **Pick same upgrade in new run**: Run increments, lifetime accumulates
8. **Buy upgrade from shop**: Shop counter increments (e.g., 🛒 1)
9. **Full reset**: Verify all persistent counters clear
10. **Load old save**: Verify no crashes, counters start at 0

### Console Verification

After implementation, test data layer in browser console:

```javascript
// Check run picks
gameState.getRunPickCounts();

// Check lifetime picks
gameState.getLifetimePickCounts();

// Check shop purchases
gameState.getShopPurchaseCounts();
```

### Visual Verification

- Badges appear only when values > 0
- Colors distinguish counter types (purple/shop, green/run, gold/lifetime)
- Layout doesn't break on small cards (mobile view)
- Locked cards show only lock icon, no badges

## Risk Assessment

**Low Risk**:

- Data layer follows existing patterns (Map for session, SvelteMap for persistent)
- UI follows existing UpgradeBadge pill pattern
- Backwards compatible with optional field

**Medium Risk**:

- Badge layout may feel cramped on small screens → Test on mobile early
- SvelteMap reactivity requires reassignment pattern → Already used correctly in shop.svelte.ts

**Mitigation**:

- Implement in phases (data layer first, testable via console)
- Only show badges conditionally (values > 0)
- Test backwards compatibility with old save file before release
