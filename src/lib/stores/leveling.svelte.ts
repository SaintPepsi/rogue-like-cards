import type { Upgrade } from '$lib/types';
import { getRandomUpgrades, getRandomLegendaryUpgrades, getExecuteCap } from '$lib/data/upgrades';
import { getXpToNextLevel } from '$lib/engine/waves';

export interface UpgradeContext {
	luckyChance: number;
	executeChance: number;
	executeCap: number;
	poison: number;
}

export function createLeveling() {
	let xp = $state(0);
	let level = $state(1);
	let pendingLevelUps = $state(0);
	let showLevelUp = $state(false);
	let upgradeChoices = $state<Upgrade[]>([]);

	let xpToNextLevel = $derived(getXpToNextLevel(level));

	function addXp(amount: number) {
		xp += amount;
	}

	/**
	 * Consume all available level-ups from current XP.
	 * Returns true if the level-up modal should be shown (newly opened).
	 */
	function checkLevelUp(ctx: UpgradeContext): boolean {
		// IMPORTANT: call getXpToNextLevel(level) directly — the $derived xpToNextLevel
		// may not recompute mid-loop in Svelte 5's synchronous batch.
		const MAX_LEVELUPS = 100;
		let leveled = false;
		for (let i = 0; i < MAX_LEVELUPS && xp >= getXpToNextLevel(level); i++) {
			pendingLevelUps++;
			xp -= getXpToNextLevel(level);
			level++;
			leveled = true;
		}

		if (!leveled) return false;

		// If already showing level up modal, just queue the additional levels
		if (showLevelUp) return false;

		upgradeChoices = getRandomUpgrades(3, ctx.luckyChance, ctx.executeChance, ctx.executeCap, ctx.poison);
		showLevelUp = true;
		return true;
	}

	/**
	 * Consume one pending level-up after an upgrade is selected.
	 * Returns true if all level-ups are consumed (modal should close).
	 */
	function consumeLevelUp(ctx: UpgradeContext): boolean {
		pendingLevelUps = Math.max(0, pendingLevelUps - 1);
		if (pendingLevelUps > 0) {
			upgradeChoices = getRandomUpgrades(3, ctx.luckyChance, ctx.executeChance, ctx.executeCap, ctx.poison);
			return false; // more pending
		}
		showLevelUp = false;
		return true; // all consumed
	}

	/**
	 * Set upgrade choices directly (used for chest loot).
	 */
	function setChoicesForChest(wasBossChest: boolean, ctx: UpgradeContext) {
		if (wasBossChest) {
			upgradeChoices = getRandomLegendaryUpgrades(3);
		} else {
			upgradeChoices = getRandomUpgrades(3, ctx.luckyChance + 0.5, ctx.executeChance, ctx.executeCap, ctx.poison);
		}
	}

	function reset() {
		xp = 0;
		level = 1;
		pendingLevelUps = 0;
		showLevelUp = false;
		upgradeChoices = [];
	}

	function restore(data: { xp: number; level: number }) {
		xp = data.xp;
		level = data.level;
	}

	return {
		get xp() {
			return xp;
		},
		get level() {
			return level;
		},
		get xpToNextLevel() {
			return xpToNextLevel;
		},
		get pendingLevelUps() {
			return pendingLevelUps;
		},
		get showLevelUp() {
			return showLevelUp;
		},
		get upgradeChoices() {
			return upgradeChoices;
		},
		addXp,
		checkLevelUp,
		consumeLevelUp,
		setChoicesForChest,
		reset,
		restore
	};
}
