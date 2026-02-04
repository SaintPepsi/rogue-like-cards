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
		version: '0.47.0',
		date: '2026-02-04',
		changes: [
			{
				category: 'new',
				description:
					'Added stats comparison on game over screen showing which stats changed during your run'
			},
			{
				category: 'changed',
				description:
					'Enforced one-way navigation flow from game over to shop — removed back button to prevent confusion'
			}
		]
	},
	{
		version: '0.46.0',
		date: '2026-02-04',
		changes: [
			{
				category: 'new',
				description:
					'Added automatic save data reset system for major beta updates to ensure clean testing of new game flows'
			}
		]
	},
	{
		version: '0.43.0',
		date: '2026-02-03',
		changes: [
			{
				category: 'new',
				description:
					'Added legendary upgrade selection at the start of each run after completing your first run'
			},
			{
				category: 'new',
				description:
					'Added automatic changelog notifications showing new entries on version updates'
			}
		]
	},
	{
		version: '0.44.0',
		date: '2026-02-03',
		changes: [
			{
				category: 'changed',
				description:
					'Redesigned critical hit system with `5` progression tiers and a `25%` hard cap'
			},
			{
				category: 'changed',
				description:
					'Redesigned execute mechanic with `5` progression tiers and reduced base cap from `-10%` to `+5%`'
			},
			{
				category: 'changed',
				description: 'Converted attack speed to percentage-based bonus system'
			},
			{
				category: 'changed',
				description:
					'Redesigned frenzy duration with base `-3s` reduced to `+1s` and separate flat/percentage upgrade paths'
			},
			{
				category: 'changed',
				description:
					'Replaced linear lucky bonus with gaussian focus-point rarity system for more strategic upgrade selection'
			},
			{
				category: 'new',
				description: 'Added separate flat and percentage upgrade paths for gold per kill bonuses'
			},
			{
				category: 'changed',
				description:
					'Spread XP multiplier upgrades across all `5` rarity tiers for better progression'
			},
			{
				category: 'changed',
				description: 'Increased rarity tier for multi-strike upgrades'
			},
			{
				category: 'changed',
				description:
					'Halved base HP (enemy `-10` → `+5`, boss `-50` → `+25`) and doubled kills per wave (`-5` → `+10`) for faster combat pacing'
			},
			{
				category: 'changed',
				description: 'Halved base XP requirement from `-25` to `+12` for faster first level-up'
			},
			{
				category: 'new',
				description:
					'Added tiered execute cap shop cards across `uncommon`, `rare`, and `epic` rarities'
			},
			{
				category: 'changed',
				description: 'Chest loot now uses actual lucky stat without artificial boosts'
			},
			{
				category: 'fixed',
				description: 'Tightened rarity curve to reduce excessive high-rarity card drops'
			},
			{
				category: 'new',
				description: 'Added rarity simulator dev tool for testing upgrade drop rates'
			}
		]
	},
	{
		version: '0.42.0',
		date: '2026-02-02',
		changes: [
			{
				category: 'new',
				description:
					'Added total stat previews on upgrade cards showing the resulting value after applying modifiers'
			}
		]
	},
	{
		version: '0.38.0',
		date: '2026-02-02',
		changes: [
			{
				category: 'new',
				description:
					'Added interactive hover/tap tooltips to all stats in the panel showing mechanical descriptions and base values'
			}
		]
	},
	{
		version: '0.36.0',
		date: '2026-02-01',
		changes: [
			{
				category: 'new',
				description:
					'Added sound effects for combat hits, enemy deaths, boss encounters, gold drops, and card interactions'
			},
			{
				category: 'new',
				description:
					'Added audio settings with volume sliders for SFX, Music, and UI buses plus a mute toggle'
			}
		]
	},
	{
		version: '0.30.0',
		date: '2026-02-01',
		changes: [
			{
				category: 'new',
				description: 'Added "Give Up" button to end a run early and visit the card shop'
			},
			{
				category: 'new',
				description: 'Shop cards can now be purchased multiple times with scaling prices per card'
			},
			{
				category: 'changed',
				description: 'Improved shop card animations with smooth fade-out and fade-in transitions'
			},
			{
				category: 'fixed',
				description:
					'Fixed shop cards for execute cap and gold per kill not showing their stat bonuses'
			},
			{
				category: 'fixed',
				description: 'Fixed chest chance cards displaying "`+0%`" instead of the actual value'
			},
			{
				category: 'fixed',
				description:
					'Fixed critical hits dealing the same damage as normal hits at low damage values'
			},
			{
				category: 'changed',
				description: 'Capped on-screen hit numbers to prevent lag during high attack-speed builds'
			}
		]
	},
	{
		version: '0.29.0',
		date: '2026-01-31',
		changes: [
			{
				category: 'new',
				description:
					'Added layered stat pipeline for cleaner stat computation with base, permanent, class, and transient layers'
			},
			{
				category: 'new',
				description:
					'Added timer-driven game loop with requestAnimationFrame for smooth attack timing'
			},
			{
				category: 'new',
				description:
					'Added hold-to-auto-attack and tap frenzy mechanics with visual frenzy indicator'
			},
			{
				category: 'new',
				description: 'Added `5` new upgrade cards for attack speed and frenzy bonuses'
			},
			{
				category: 'changed',
				description:
					'Redesigned upgrade cards to use declarative stat modifiers instead of imperative apply functions'
			}
		]
	},
	{
		version: '0.28.0',
		date: '2026-01-30',
		changes: [
			{
				category: 'changed',
				description:
					'Rebalanced XP curve so early levels require more XP, making progression more gradual'
			},
			{
				category: 'changed',
				description:
					'Increased shop card prices and reduced gold drop chance for a more meaningful economy'
			},
			{
				category: 'new',
				description:
					'Added upgrade queue — level-ups and chest loot are now deferred until you choose to open them'
			},
			{
				category: 'new',
				description:
					'Added upgrade badge button on the level bar to open pending upgrades on your terms'
			},
			{
				category: 'fixed',
				description: 'Fixed chest enemy sprite showing open chest instead of closed chest'
			}
		]
	},
	{
		version: '0.24.0',
		date: '2026-01-30',
		changes: [
			{
				category: 'fixed',
				description:
					'Fixed upgrade card rarity selection so higher-rarity cards actually appear at intended rates'
			},
			{
				category: 'changed',
				description: 'Changed rarity drop rates to taper at `1/3` per tier for a steeper curve'
			},
			{
				category: 'changed',
				description: 'Changed chest loot to only offer `uncommon` or better cards'
			},
			{ category: 'changed', description: 'Disabled execute from triggering on boss enemies' },
			{ category: 'fixed', description: 'Fixed gold drop stats not appearing in the stats panel' }
		]
	},
	{
		version: '0.18.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'fixed',
				description: 'Fixed game freeze caused by infinite reactive loop in gold drop animation'
			},
			{
				category: 'fixed',
				description:
					'Fixed boss timer running during level-up modal when killing the final wave enemy'
			}
		]
	},
	{
		version: '0.17.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'fixed',
				description:
					'Fixed game freeze caused by poison killing enemies while level-up modal was open'
			}
		]
	},
	{
		version: '0.16.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'fixed',
				description:
					'Fixed changelog category labels still overlapping description text on narrow screens'
			}
		]
	},
	{
		version: '0.15.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'fixed',
				description:
					'Fixed changelog category labels overlapping description text on narrow screens'
			}
		]
	},
	{
		version: '0.14.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'fixed',
				description: 'Fixed number overflow causing display issues at high stages'
			},
			{ category: 'fixed', description: 'Balanced XP scaling curve to prevent runaway progression' }
		]
	},
	{
		version: '0.13.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'changed',
				description:
					'Redesigned changelog system with categorized entries for new features, changes, and fixes'
			}
		]
	},
	{
		version: '0.12.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'new',
				description: 'Chests can now spawn during stages with scaling spawn chance upgrades'
			},
			{
				category: 'new',
				description: 'Boss chests drop `legendary`-only loot with multiplied health'
			},
			{ category: 'new', description: 'Added `2` new chest spawn rate upgrade cards to discover' }
		]
	},
	{
		version: '0.11.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'new',
				description:
					'Mobs now have a chance to drop gold on kill — bosses drop more than regular enemies'
			},
			{
				category: 'new',
				description: 'Added `3` new gold drop chance upgrade cards to discover during level-ups'
			},
			{
				category: 'new',
				description: 'Added a stackable shop card that increases gold earned per kill'
			},
			{
				category: 'changed',
				description: 'Gold counter is now always visible during gameplay with drop animations'
			}
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
			{
				category: 'changed',
				description: 'EXP rewards are now based on enemy health with a uniform XP-per-HP rate'
			},
			{
				category: 'changed',
				description:
					'Bosses and chests give bonus EXP via dedicated multipliers on top of the base rate'
			},
			{
				category: 'changed',
				description:
					'XP-per-HP rate gradually decreases at higher stages so progression naturally slows'
			},
			{
				category: 'fixed',
				description:
					'Fixed multi-strike attacks only applying one poison stack instead of one per strike'
			}
		]
	},
	{
		version: '0.8.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'new',
				description: 'Poison rework — attacks now apply poison stacks to enemies'
			},
			{ category: 'new', description: 'Poison stacks have a duration and tick down over time' },
			{ category: 'new', description: 'Enemies now show a poison stack counter' },
			{ category: 'new', description: 'Added `8` new poison upgrade cards to discover' },
			{ category: 'new', description: 'Stats panel now shows poison stack details' },
			{
				category: 'fixed',
				description: 'Fixed reset button not clearing bank purchases and persistent data'
			}
		]
	},
	{
		version: '0.6.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'new',
				description: 'Added number formatting with K/M/B/T suffixes for large numbers'
			}
		]
	},
	{
		version: '0.5.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'new',
				description: 'Added staggered card flip animation when level-up and chest loot modals open'
			},
			{
				category: 'changed',
				description:
					'Cards are disabled until their flip animation completes, preventing accidental picks on mobile'
			}
		]
	},
	{
		version: '0.4.0',
		date: '2026-01-29',
		changes: [
			{
				category: 'changed',
				description: 'Reworked execute mechanic from health threshold to percentage-based chance'
			},
			{
				category: 'new',
				description: 'Added configurable execute chance cap with exponential pricing'
			},
			{
				category: 'fixed',
				description: 'Fixed build error caused by misplaced template directive in shop component'
			}
		]
	},
	{
		version: '0.3.0',
		date: '2026-01-25',
		changes: [{ category: 'new', description: 'Added horizontal card carousel for mobile views' }]
	},
	{
		version: '0.2.0',
		date: '2026-01-24',
		changes: [{ category: 'fixed', description: 'Fixed version bumping CI workflow' }]
	},
	{
		version: '0.1.0',
		date: '2026-01-24',
		changes: [
			{ category: 'new', description: 'Initial release with core rogue-like card gameplay' }
		]
	}
];
