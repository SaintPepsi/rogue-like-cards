// NOTE: PlayerStats could live in engine/stats.ts alongside BASE_STATS (they always change together).
// HitType, HitInfo, GoldDrop are UI-only types that could move to stores/uiEffects.svelte.ts.
// Kept here for now as a shared type module — revisit if types.ts grows further.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type StatModifier = {
	stat: keyof PlayerStats;
	value: number;
};

export type PlayerStats = {
	damage: number;
	critChance: number;
	critMultiplier: number;
	xpMultiplier: number;
	damageMultiplier: number; // Final damage multiplier (applies to all damage including poison)
	// New mechanics
	poison: number; // Damage per tick per stack
	poisonCritChance: number; // Chance for poison to crit
	poisonMaxStacks: number; // Max concurrent poison stacks on enemy
	poisonDuration: number; // How many seconds each poison stack lasts
	multiStrike: number; // Extra attacks per click
	overkill: boolean; // Excess damage carries over
	executeChance: number; // Chance to instantly kill on hit
	bonusBossTime: number; // Extra seconds for boss fights
	greed: number; // Enemy health multiplier (also increases XP)
	luckyChance: number; // Chance for rarer upgrades
	chestChance: number; // Chance for chest to spawn
	bossChestChance: number; // Chance for boss to become a chest (rolled on top of chest roll)
	goldMultiplier: number; // Bonus gold from chests
	goldDropChance: number; // Chance for mobs to drop gold on kill
	goldPerKill: number; // Bonus flat gold per kill drop
	attackSpeed: number;
	attackSpeedBonus: number; // Percentage bonus to attack speed (additive, then multiplied with base)
	tapFrenzyBonus: number;
	tapFrenzyDuration: number;
	tapFrenzyDurationBonus: number; // Percentage bonus to frenzy duration
	tapFrenzyStackMultiplier: number; // Multiplier on frenzy stacks per tap (legendary-only)
	executeCap: number; // Max execute chance (from shop upgrades)
};

export type Upgrade = {
	id: string;
	title: string;
	rarity: Rarity;
	image: string;
	modifiers: StatModifier[];
	onAcquire?: () => void;
};

export type Effect = {
	name: string;
	description: string;
};

export type HitType =
	| 'normal'
	| 'crit'
	| 'execute'
	| 'poison'
	| 'poisonCrit'
	| 'hit'
	| 'criticalHit'
	| 'executeHit';

export type HitInfo = {
	damage: number;
	type: HitType;
	id: number;
	index: number; // For positioning multiple hits
};

export type GoldDrop = {
	id: number;
	amount: number;
};
