export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type StatModifier = {
	icon: string;
	label: string;
	value: string;
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
};

export type Upgrade = {
	id: string;
	title: string;
	rarity: Rarity;
	image: string;
	stats: StatModifier[];
	apply: (stats: PlayerStats) => void;
};

export type Effect = {
	name: string;
	description: string;
};

export type HitType = 'normal' | 'crit' | 'execute' | 'poison' | 'poisonCrit';

export type HitInfo = {
	damage: number;
	type: HitType;
	id: number;
	index: number; // For positioning multiple hits
};
