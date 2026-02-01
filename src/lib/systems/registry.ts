import { executeSystem } from './execute';
import { critSystem } from './crit';
import { damageMultiplierSystem } from './damageMultiplier';
import { poisonSystem } from './poison';
import type { SystemDefinition } from '$lib/engine/systemPipeline';

// All game systems registered in one place.
// Order doesn't matter — pipeline sorts by priority for transforms.
export const allSystems: SystemDefinition[] = [
	executeSystem,
	critSystem,
	damageMultiplierSystem,
	poisonSystem
];
