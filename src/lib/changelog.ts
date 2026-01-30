export type ChangeCategory = 'new' | 'changed' | 'fixed';

export interface ChangeItem {
	category: ChangeCategory;
	description: string;
}

export interface ChangelogEntry {
	version: string;
	date: string;
	changes: ChangeItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '0.20.0',
		date: '2026-01-30',
		changes: [
			{ category: 'fixed', description: 'Fixed gold drop stats not appearing in the stats panel' }
		]
	},
	{
		version: '0.18.0',
		date: '2026-01-29',
		changes: [
			{ category: 'fixed', description: 'Fixed game freeze caused by infinite reactive loop in gold drop animation' },
			{ category: 'fixed', description: 'Fixed boss timer running during level-up modal when killing the final wave enemy' }
		]
	},
	{
		version: '0.17.0',
		date: '2026-01-29',
		changes: [
			{ category: 'fixed', description: 'Fixed game freeze caused by poison killing enemies while level-up modal was open' }
		]
	},
	{
		version: '0.16.0',
		date: '2026-01-29',
		changes: [
			{ category: 'fixed', description: 'Fixed changelog category labels still overlapping description text on narrow screens' }
		]
	},
	{
		version: '0.15.0',
		date: '2026-01-29',
		changes: [
			{ category: 'fixed', description: 'Fixed changelog category labels overlapping description text on narrow screens' }
		]
	},
	{
		version: '0.14.0',
		date: '2026-01-29',
		changes: [
			{ category: 'fixed', description: 'Fixed number overflow causing display issues at high stages' },
			{ category: 'fixed', description: 'Balanced XP scaling curve to prevent runaway progression' }
		]
	},
	{
		version: '0.13.0',
		date: '2026-01-29',
		changes: [
			{ category: 'changed', description: 'Redesigned changelog system with categorized entries for new features, changes, and fixes' }
		]
	},
	{
		version: '0.12.0',
		date: '2026-01-29',
		changes: [
			{ category: 'new', description: 'Chests can now spawn during stages with scaling spawn chance upgrades' },
			{ category: 'new', description: 'Boss chests drop legendary-only loot with multiplied health' },
			{ category: 'new', description: 'Added 2 new chest spawn rate upgrade cards to discover' }
		]
	},
	{
		version: '0.11.0',
		date: '2026-01-29',
		changes: [
			{ category: 'new', description: 'Mobs now have a chance to drop gold on kill — bosses drop more than regular enemies' },
			{ category: 'new', description: 'Added 3 new gold drop chance upgrade cards to discover during level-ups' },
			{ category: 'new', description: 'Added a stackable shop card that increases gold earned per kill' },
			{ category: 'changed', description: 'Gold counter is now always visible during gameplay with drop animations' }
		]
	},
	{
		version: '0.10.0',
		date: '2026-01-29',
		changes: [
			{ category: 'changed', description: 'Redesigned shop system with tier-based pricing' },
			{ category: 'new', description: 'Added a stackable shop card for execute chance cap' },
			{ category: 'new', description: 'Shop cards now have a buy animation' }
		]
	},
	{
		version: '0.9.0',
		date: '2026-01-29',
		changes: [
			{ category: 'changed', description: 'EXP rewards are now based on enemy health with a uniform XP-per-HP rate' },
			{ category: 'changed', description: 'Bosses and chests give bonus EXP via dedicated multipliers on top of the base rate' },
			{ category: 'changed', description: 'XP-per-HP rate gradually decreases at higher stages so progression naturally slows' },
			{ category: 'fixed', description: 'Fixed multi-strike attacks only applying one poison stack instead of one per strike' }
		]
	},
	{
		version: '0.8.0',
		date: '2026-01-29',
		changes: [
			{ category: 'new', description: 'Poison rework — attacks now apply poison stacks to enemies' },
			{ category: 'new', description: 'Poison stacks have a duration and tick down over time' },
			{ category: 'new', description: 'Enemies now show a poison stack counter' },
			{ category: 'new', description: 'Added 8 new poison upgrade cards to discover' },
			{ category: 'new', description: 'Stats panel now shows poison stack details' },
			{ category: 'fixed', description: 'Fixed reset button not clearing bank purchases and persistent data' }
		]
	},
	{
		version: '0.6.0',
		date: '2026-01-29',
		changes: [
			{ category: 'new', description: 'Added number formatting with K/M/B/T suffixes for large numbers' }
		]
	},
	{
		version: '0.5.0',
		date: '2026-01-29',
		changes: [
			{ category: 'new', description: 'Added staggered card flip animation when level-up and chest loot modals open' },
			{ category: 'changed', description: 'Cards are disabled until their flip animation completes, preventing accidental picks on mobile' }
		]
	},
	{
		version: '0.4.0',
		date: '2026-01-29',
		changes: [
			{ category: 'changed', description: 'Reworked execute mechanic from health threshold to percentage-based chance' },
			{ category: 'new', description: 'Added configurable execute chance cap with exponential pricing' },
			{ category: 'fixed', description: 'Fixed build error caused by misplaced template directive in shop component' }
		]
	},
	{
		version: '0.3.0',
		date: '2026-01-25',
		changes: [
			{ category: 'new', description: 'Added horizontal card carousel for mobile views' }
		]
	},
	{
		version: '0.2.0',
		date: '2026-01-24',
		changes: [
			{ category: 'fixed', description: 'Fixed version bumping CI workflow' }
		]
	},
	{
		version: '0.1.0',
		date: '2026-01-24',
		changes: [
			{ category: 'new', description: 'Initial release with core rogue-like card gameplay' }
		]
	}
];
