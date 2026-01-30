import type { Upgrade } from '$lib/types';
import { getRandomUpgrades, getRandomLegendaryUpgrades } from '$lib/data/upgrades';
import { getXpToNextLevel } from '$lib/engine/waves';

export interface UpgradeContext {
	luckyChance: number;
	executeChance: number;
	executeCap: number;
	poison: number;
}

export type UpgradeEventType = 'levelup' | 'chest';

export interface UpgradeEvent {
	type: UpgradeEventType;
	choices: Upgrade[];
	gold?: number;
}

export function createLeveling() {
	let xp = $state(0);
	let level = $state(1);
	let upgradeQueue = $state<UpgradeEvent[]>([]);
	let activeEvent = $state<UpgradeEvent | null>(null);
	let upgradeChoices = $state<Upgrade[]>([]);

	let xpToNextLevel = $derived(getXpToNextLevel(level));

	function addXp(amount: number) {
		xp += amount;
	}

	/**
	 * Consume all available level-ups from current XP.
	 * Pushes events to the queue instead of auto-showing a modal.
	 * Returns the number of level-ups earned.
	 */
	function checkLevelUp(ctx: UpgradeContext): number {
		const MAX_LEVELUPS = 100;
		let leveled = 0;
		for (let i = 0; i < MAX_LEVELUPS && xp >= getXpToNextLevel(level); i++) {
			xp -= getXpToNextLevel(level);
			level++;
			leveled++;
			const choices = getRandomUpgrades(3, ctx.luckyChance, ctx.executeChance, ctx.executeCap, ctx.poison);
			upgradeQueue = [...upgradeQueue, { type: 'levelup', choices }];
		}
		return leveled;
	}

	/**
	 * Queue a chest loot event.
	 */
	function queueChestLoot(wasBossChest: boolean, ctx: UpgradeContext, gold: number) {
		let choices: Upgrade[];
		if (wasBossChest) {
			choices = getRandomLegendaryUpgrades(3);
		} else {
			choices = getRandomUpgrades(3, ctx.luckyChance + 0.5, ctx.executeChance, ctx.executeCap, ctx.poison, 'uncommon');
		}
		upgradeQueue = [...upgradeQueue, { type: 'chest', choices, gold }];
	}

	/**
	 * Open the next upgrade event from the queue.
	 * Returns the event if one was available, null otherwise.
	 */
	function openNextUpgrade(): UpgradeEvent | null {
		if (upgradeQueue.length === 0) return null;
		const [next, ...rest] = upgradeQueue;
		upgradeQueue = rest;
		activeEvent = next;
		upgradeChoices = next.choices;
		return next;
	}

	/**
	 * Close the active upgrade event after selection.
	 * Returns true if queue is now empty.
	 */
	function closeActiveEvent(): boolean {
		activeEvent = null;
		upgradeChoices = [];
		return upgradeQueue.length === 0;
	}

	function reset() {
		xp = 0;
		level = 1;
		upgradeQueue = [];
		activeEvent = null;
		upgradeChoices = [];
	}

	function restore(data: { xp: number; level: number }) {
		xp = data.xp;
		level = data.level;
	}

	return {
		get xp() { return xp; },
		get level() { return level; },
		get xpToNextLevel() { return xpToNextLevel; },
		get pendingUpgrades() { return upgradeQueue.length; },
		get activeEvent() { return activeEvent; },
		get upgradeChoices() { return upgradeChoices; },
		get hasActiveEvent() { return activeEvent !== null; },
		get upgradeQueue() { return upgradeQueue; },
		addXp,
		checkLevelUp,
		queueChestLoot,
		openNextUpgrade,
		closeActiveEvent,
		reset,
		restore
	};
}
