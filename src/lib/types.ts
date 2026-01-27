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
	// New mechanics
	poison: number; // Damage per second
	multiStrike: number; // Extra attacks per click
	overkill: boolean; // Excess damage carries over
	executeThreshold: number; // Instant kill below this % health
	bonusBossTime: number; // Extra seconds for boss fights
	greed: number; // Enemy health multiplier (also increases XP)
	luckyChance: number; // Chance for rarer upgrades
	chestChance: number; // Chance for chest to spawn
	goldMultiplier: number; // Bonus gold from chests
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

export type HitInfo = {
	damage: number;
	crit: boolean;
	id: number;
};
