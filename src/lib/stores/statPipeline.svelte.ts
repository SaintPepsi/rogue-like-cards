import {
	computeLayered,
	createLayer,
	dirtyLayer,
	add,
	clampMin,
	type PipelineLayer,
	type StatStep
} from '$lib/engine/statPipeline';
import { BASE_STATS } from '$lib/engine/stats';
import { allUpgrades } from '$lib/data/upgrades';
import type { PlayerStats, StatModifier } from '$lib/types';

type StatKey = keyof PlayerStats;
type SourcedModifier = StatModifier & { source: string };

// Pipeline layers per stat:
// 0: Base (class overrides)
// 1: Permanent (acquired upgrades + shop)
// 2: Class bonuses (from class selection)
// 3: Transient (enemy effects, frenzy, buffs/debuffs)
// 4: Clamp (floor at 0)
const LAYER_BASE = 0;
const LAYER_PERMANENT = 1;
const LAYER_CLASS = 2;
const LAYER_TRANSIENT = 3;
const LAYER_CLAMP = 4;
const LAYER_COUNT = 5;

export function createStatPipeline() {
	// Per-stat pipeline layers
	let pipelines = $state<Record<StatKey, PipelineLayer[]>>(initPipelines());

	// Sources of truth
	let acquiredUpgradeIds = $state<string[]>([]);
	let transientModifiers = $state<SourcedModifier[]>([]);
	let transientSteps = $state<{ stat: StatKey; step: StatStep; source: string }[]>([]);

	function initPipelines(): Record<StatKey, PipelineLayer[]> {
		const result = {} as Record<StatKey, PipelineLayer[]>;
		for (const key of Object.keys(BASE_STATS) as StatKey[]) {
			result[key] = Array.from({ length: LAYER_COUNT }, () => createLayer([]));
			result[key][LAYER_CLAMP] = createLayer([clampMin(0)]);
		}
		return result;
	}

	function rebuildLayer(layerIndex: number, modifiers: StatModifier[]): void {
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			const steps: StatStep[] = [];
			for (const mod of modifiers) {
				if (mod.stat === stat) {
					steps.push(add(mod.value));
				}
			}
			pipelines[stat][layerIndex] = createLayer(steps);
			dirtyLayer(pipelines[stat], layerIndex);
		}
	}

	function rebuildTransientLayer(): void {
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			const steps: StatStep[] = [];

			// Additive transient modifiers
			for (const mod of transientModifiers) {
				if (mod.stat === stat) {
					steps.push(add(mod.value));
				}
			}

			// Custom step transient modifiers (multiply, conditional, etc.)
			for (const entry of transientSteps) {
				if (entry.stat === stat) {
					steps.push(entry.step);
				}
			}

			pipelines[stat][LAYER_TRANSIENT] = createLayer(steps);
			dirtyLayer(pipelines[stat], LAYER_TRANSIENT);
		}
	}

	function get(stat: StatKey): number {
		return computeLayered(BASE_STATS[stat] as number, pipelines[stat]);
	}

	// --- Public API ---

	function collectPermanentModifiers(): StatModifier[] {
		const allMods: StatModifier[] = [];
		for (const id of acquiredUpgradeIds) {
			const card = allUpgrades.find((u) => u.id === id);
			if (card) allMods.push(...card.modifiers);
		}
		return allMods;
	}

	function acquireUpgrade(upgradeId: string): void {
		acquiredUpgradeIds = [...acquiredUpgradeIds, upgradeId];
		rebuildLayer(LAYER_PERMANENT, collectPermanentModifiers());
	}

	function setAcquiredUpgrades(ids: string[]): void {
		acquiredUpgradeIds = [...ids];
		rebuildLayer(LAYER_PERMANENT, collectPermanentModifiers());
	}

	function setClassBase(overrides: StatModifier[]): void {
		rebuildLayer(LAYER_BASE, overrides);
	}

	function setClassModifiers(mods: StatModifier[]): void {
		rebuildLayer(LAYER_CLASS, mods);
	}

	function addTransient(source: string, mods: StatModifier[]): void {
		transientModifiers = [...transientModifiers, ...mods.map((m) => ({ ...m, source }))];
		rebuildTransientLayer();
	}

	function addTransientStep(source: string, stat: StatKey, step: StatStep): void {
		transientSteps = [...transientSteps, { stat, step, source }];
		rebuildTransientLayer();
	}

	function removeTransient(source: string): void {
		transientModifiers = transientModifiers.filter((m) => m.source !== source);
		transientSteps = transientSteps.filter((s) => s.source !== source);
		rebuildTransientLayer();
	}

	function clearTransients(): void {
		transientModifiers = [];
		transientSteps = [];
		rebuildTransientLayer();
	}

	function dirtyAll(): void {
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			dirtyLayer(pipelines[stat], 0);
		}
	}

	function reset(): void {
		acquiredUpgradeIds = [];
		transientModifiers = [];
		transientSteps = [];
		pipelines = initPipelines();
	}

	return {
		get,
		get acquiredUpgradeIds() {
			return acquiredUpgradeIds;
		},
		acquireUpgrade,
		setAcquiredUpgrades,
		setClassBase,
		setClassModifiers,
		addTransient,
		addTransientStep,
		removeTransient,
		clearTransients,
		dirtyAll,
		reset
	};
}
