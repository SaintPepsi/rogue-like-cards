import { describe, it, expect } from 'vitest';
import { simulateBuild, applyUpgradeToStats, type BuildStep } from './simulator';
import { createDefaultStats, BASE_STATS } from './stats';
import { createStatPipeline } from '$lib/stores/statPipeline.svelte';
import { allUpgrades } from '$lib/data/upgrades';

describe('applyUpgradeToStats drift detection', () => {
	// DECISION: This test catches drift between the simulator's pure applyUpgradeToStats
	// and the real statPipeline.acquireUpgrade(). If statPipeline gains new modifier types
	// (multiply, conditional, etc.) that applyUpgradeToStats doesn't handle, this fails.
	it('matches statPipeline output for same upgrades', () => {
		// Test a representative sample of upgrades across different stat types
		const testUpgradeIds = allUpgrades
			.filter((u) => u.modifiers.length > 0)
			.slice(0, 15)
			.map((u) => u.id);

		// Apply via simulator's pure function
		let simulatorStats = createDefaultStats();
		for (const id of testUpgradeIds) {
			simulatorStats = applyUpgradeToStats(simulatorStats, id);
		}

		// Apply via real statPipeline
		const pipeline = createStatPipeline();
		for (const id of testUpgradeIds) {
			pipeline.acquireUpgrade(id);
		}

		// Compare every numeric stat
		for (const key of Object.keys(BASE_STATS) as (keyof typeof BASE_STATS)[]) {
			const pipelineValue = pipeline.get(key);
			const simulatorValue = simulatorStats[key];
			if (typeof simulatorValue === 'number') {
				expect(simulatorValue, `stat "${key}" drifted`).toBeCloseTo(pipelineValue as number);
			}
		}
	});
});

describe('simulateBuild', () => {
	it('returns one snapshot per stage with no upgrades', () => {
		const snapshots = simulateBuild([], 5);
		expect(snapshots).toHaveLength(5);
		expect(snapshots[0].stage).toBe(1);
		expect(snapshots[4].stage).toBe(5);
	});

	it('has increasing enemy HP across stages', () => {
		const snapshots = simulateBuild([], 10);
		for (let i = 1; i < snapshots.length; i++) {
			expect(snapshots[i].enemyHp).toBeGreaterThan(snapshots[i - 1].enemyHp);
		}
	});

	it('applies upgrades at the correct stage', () => {
		const plan: BuildStep[] = [{ level: 3, upgradeId: 'damage_1' }];
		const snapshots = simulateBuild(plan, 5);
		// Stage 2 should have default damage DPS, stage 3 should be higher
		expect(snapshots[2].computedDps).toBeGreaterThan(snapshots[1].computedDps);
		// Stage 1 and 2 should have same DPS (no upgrades yet)
		expect(snapshots[0].computedDps).toBeCloseTo(snapshots[1].computedDps);
	});

	it('computes timeToKill as enemyHp / dps', () => {
		const snapshots = simulateBuild([], 3);
		for (const snap of snapshots) {
			expect(snap.timeToKill).toBeCloseTo(snap.enemyHp / snap.computedDps);
		}
	});

	it('accumulates multiple upgrades', () => {
		const plan: BuildStep[] = [
			{ level: 1, upgradeId: 'damage_1' },
			{ level: 2, upgradeId: 'damage_2' },
			{ level: 3, upgradeId: 'damage_3' }
		];
		const snapshots = simulateBuild(plan, 3);
		// Each stage should have higher DPS than the last
		expect(snapshots[1].computedDps).toBeGreaterThan(snapshots[0].computedDps);
		expect(snapshots[2].computedDps).toBeGreaterThan(snapshots[1].computedDps);
	});
});
