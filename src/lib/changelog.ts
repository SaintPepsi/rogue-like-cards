export interface ChangelogEntry {
	version: string;
	date: string;
	changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '0.7.0',
		date: '2026-01-29',
		changes: [
			'Poison rework — attacks now apply poison stacks to enemies',
			'Poison stacks have a duration and tick down over time',
			'Enemies now show a poison stack counter',
			'Added 8 new poison upgrade cards to discover',
			'Stats panel now shows poison stack details',
			'Fixed reset button not clearing bank purchases and persistent data'
		]
	},
	{
		version: '0.5.0',
		date: '2026-01-29',
		changes: [
			'Added number formatting with K/M/B/T suffixes for large numbers'
		]
	},
	{
		version: '0.4.0',
		date: '2026-01-29',
		changes: [
			'Added staggered card flip animation when level-up and chest loot modals open',
			'Cards are disabled until their flip animation completes, preventing accidental picks on mobile'
		]
	},
	{
		version: '0.3.0',
		date: '2026-01-25',
		changes: ['Added horizontal card carousel for mobile views']
	},
	{
		version: '0.2.0',
		date: '2026-01-24',
		changes: ['Fixed version bumping CI workflow']
	},
	{
		version: '0.1.0',
		date: '2026-01-24',
		changes: ['Initial release with core rogue-like card gameplay']
	}
];
