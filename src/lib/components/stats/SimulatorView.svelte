<script lang="ts">
	import { allUpgrades } from '$lib/data/upgrades';
	import { simulateBuild, type BuildStep } from '$lib/engine/simulator';
	import type { StatSnapshot } from '$lib/stores/runHistory.svelte';
	import StatGroup from './StatGroup.svelte';
	import StatChart from './StatChart.svelte';

	let search = $state('');
	let maxStage = $state(50);
	let buildPlan: BuildStep[] = $state([]);
	let nextLevel = $state(1);

	const filteredUpgrades = $derived(
		search.length > 0
			? allUpgrades.filter(
					(u) =>
						u.title.toLowerCase().includes(search.toLowerCase()) ||
						u.id.toLowerCase().includes(search.toLowerCase())
				)
			: allUpgrades
	);

	const snapshots: StatSnapshot[] = $derived(simulateBuild(buildPlan, maxStage));
	const labels: number[] = $derived(snapshots.map((s) => s.stage));

	function addUpgrade(upgradeId: string) {
		buildPlan = [...buildPlan, { level: nextLevel, upgradeId }];
	}

	function removeStep(index: number) {
		buildPlan = buildPlan.filter((_, i) => i !== index);
	}

	function clearPlan() {
		buildPlan = [];
	}

	// Presets: common archetype build plans
	const PRESETS: { name: string; steps: BuildStep[] }[] = [
		{
			name: 'Damage',
			steps: [
				{ level: 1, upgradeId: 'damage_1' },
				{ level: 2, upgradeId: 'damage_2' },
				{ level: 3, upgradeId: 'damage_3' },
				{ level: 5, upgradeId: 'crit_chance_1' },
				{ level: 7, upgradeId: 'crit_damage_1' },
				{ level: 10, upgradeId: 'damage_4' },
				{ level: 12, upgradeId: 'damage_multiplier_1' },
				{ level: 15, upgradeId: 'attack_speed_1' }
			]
		},
		{
			name: 'Poison',
			steps: [
				{ level: 1, upgradeId: 'poison_1' },
				{ level: 2, upgradeId: 'poison_2' },
				{ level: 3, upgradeId: 'poison_stacks_1' },
				{ level: 5, upgradeId: 'poison_duration_1' },
				{ level: 7, upgradeId: 'poison_3' },
				{ level: 10, upgradeId: 'poison_stacks_2' },
				{ level: 12, upgradeId: 'poison_crit_1' }
			]
		},
		{
			name: 'Speed',
			steps: [
				{ level: 1, upgradeId: 'attack_speed_1' },
				{ level: 2, upgradeId: 'attack_speed_2' },
				{ level: 3, upgradeId: 'multi_strike_1' },
				{ level: 5, upgradeId: 'attack_speed_3' },
				{ level: 7, upgradeId: 'multi_strike_2' },
				{ level: 10, upgradeId: 'damage_2' }
			]
		},
		{
			name: 'Crit',
			steps: [
				{ level: 1, upgradeId: 'crit_chance_1' },
				{ level: 2, upgradeId: 'crit_damage_1' },
				{ level: 3, upgradeId: 'crit_chance_2' },
				{ level: 5, upgradeId: 'crit_damage_2' },
				{ level: 7, upgradeId: 'crit_chance_3' },
				{ level: 10, upgradeId: 'damage_3' }
			]
		}
	];

	function loadPreset(preset: { name: string; steps: BuildStep[] }) {
		buildPlan = [...preset.steps];
	}

	const COLORS = {
		damage: '#ef4444',
		critChance: '#f59e0b',
		critMultiplier: '#f97316',
		attackSpeed: '#22d3ee',
		multiStrike: '#a855f7',
		dps: '#8b5cf6',
		poison: '#22c55e',
		poisonStacks: '#16a34a',
		poisonDuration: '#86efac',
		poisonDps: '#15803d',
		execute: '#dc2626',
		executeCap: '#991b1b',
		damageMult: '#fb923c',
		xpMult: '#38bdf8',
		goldPerKill: '#fbbf24',
		goldDrop: '#d97706',
		goldMult: '#f59e0b',
		enemyHp: '#ef4444',
		bossHp: '#dc2626',
		xpToNext: '#818cf8',
		ttk: '#f472b6'
	};

	const RARITY_COLORS: Record<string, string> = {
		common: '#9ca3af',
		uncommon: '#22c55e',
		rare: '#3b82f6',
		epic: '#a855f7',
		legendary: '#f59e0b'
	};
</script>

<div class="simulator">
	<div class="controls">
		<div class="build-planner">
			<h3>Build Planner</h3>

			<div class="presets">
				{#each PRESETS as preset}
					<button class="preset-btn" onclick={() => loadPreset(preset)}>{preset.name}</button>
				{/each}
				<button class="preset-btn clear" onclick={clearPlan}>Clear</button>
			</div>

			<div class="add-controls">
				<label>
					At stage:
					<input type="number" bind:value={nextLevel} min={1} max={maxStage} />
				</label>
			</div>

			<input type="text" bind:value={search} placeholder="Search upgrades..." class="search" />

			<div class="upgrade-list">
				{#each filteredUpgrades as upgrade}
					<button
						class="upgrade-item"
						onclick={() => addUpgrade(upgrade.id)}
						style="border-left: 3px solid {RARITY_COLORS[upgrade.rarity]}"
					>
						<span class="upgrade-title">{upgrade.title}</span>
						<span class="upgrade-rarity" style="color: {RARITY_COLORS[upgrade.rarity]}"
							>{upgrade.rarity}</span
						>
					</button>
				{/each}
			</div>
		</div>

		<div class="plan-summary">
			<h3>Current Build ({buildPlan.length} upgrades)</h3>
			<div class="stage-range">
				<label>
					Max Stage: {maxStage}
					<input type="range" bind:value={maxStage} min={5} max={200} />
				</label>
			</div>
			{#if buildPlan.length === 0}
				<p class="empty-plan">Add upgrades or load a preset.</p>
			{:else}
				<div class="plan-list">
					{#each buildPlan as step, i}
						<div class="plan-step">
							<span class="step-level">Stage {step.level}:</span>
							<span class="step-upgrade">{step.upgradeId}</span>
							<button class="remove-btn" onclick={() => removeStep(i)}>×</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if snapshots.length > 0}
		<div class="charts">
			<StatGroup title="Offensive Stats" expanded={true}>
				<StatChart
					title="Offensive Stats"
					{labels}
					datasets={[
						{
							label: 'Base Damage',
							data: snapshots.map((s) => s.stats.damage),
							borderColor: COLORS.damage
						},
						{
							label: 'Crit Chance %',
							data: snapshots.map((s) => s.stats.critChance * 100),
							borderColor: COLORS.critChance
						},
						{
							label: 'Crit Multiplier',
							data: snapshots.map((s) => s.stats.critMultiplier),
							borderColor: COLORS.critMultiplier
						},
						{
							label: 'Attack Speed',
							data: snapshots.map((s) => s.stats.attackSpeed),
							borderColor: COLORS.attackSpeed
						},
						{
							label: 'Multi-Strike',
							data: snapshots.map((s) => s.stats.multiStrike),
							borderColor: COLORS.multiStrike,
							stepped: 'before'
						},
						{
							label: 'Effective DPS',
							data: snapshots.map((s) => s.computedDps),
							borderColor: COLORS.dps
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Poison Stats">
				<StatChart
					title="Poison Stats"
					{labels}
					datasets={[
						{
							label: 'Poison/Stack',
							data: snapshots.map((s) => s.stats.poison),
							borderColor: COLORS.poison
						},
						{
							label: 'Max Stacks',
							data: snapshots.map((s) => s.stats.poisonMaxStacks),
							borderColor: COLORS.poisonStacks,
							stepped: 'before'
						},
						{
							label: 'Duration (s)',
							data: snapshots.map((s) => s.stats.poisonDuration),
							borderColor: COLORS.poisonDuration
						},
						{
							label: 'Poison DPS',
							data: snapshots.map((s) => s.poisonDps),
							borderColor: COLORS.poisonDps
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Execute & Multipliers">
				<StatChart
					title="Execute & Multipliers"
					{labels}
					datasets={[
						{
							label: 'Execute Chance %',
							data: snapshots.map((s) => s.stats.executeChance * 100),
							borderColor: COLORS.execute
						},
						{
							label: 'Execute Cap %',
							data: snapshots.map((s) => s.stats.executeCap * 100),
							borderColor: COLORS.executeCap
						},
						{
							label: 'Damage Multiplier',
							data: snapshots.map((s) => s.stats.damageMultiplier),
							borderColor: COLORS.damageMult
						},
						{
							label: 'XP Multiplier',
							data: snapshots.map((s) => s.stats.xpMultiplier),
							borderColor: COLORS.xpMult
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Economy">
				<StatChart
					title="Economy"
					{labels}
					datasets={[
						{
							label: 'Gold/Kill',
							data: snapshots.map((s) => s.stats.goldPerKill),
							borderColor: COLORS.goldPerKill
						},
						{
							label: 'Gold Drop %',
							data: snapshots.map((s) => s.stats.goldDropChance * 100),
							borderColor: COLORS.goldDrop
						},
						{
							label: 'Gold Multiplier',
							data: snapshots.map((s) => s.stats.goldMultiplier),
							borderColor: COLORS.goldMult
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Enemy Scaling">
				<StatChart
					title="Enemy Scaling"
					{labels}
					logScale={true}
					datasets={[
						{
							label: 'Enemy HP',
							data: snapshots.map((s) => s.enemyHp),
							borderColor: COLORS.enemyHp
						},
						{ label: 'Boss HP', data: snapshots.map((s) => s.bossHp), borderColor: COLORS.bossHp },
						{
							label: 'XP to Next Level',
							data: snapshots.map((s) => s.xpToNextLevel),
							borderColor: COLORS.xpToNext
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Composite Views">
				<StatChart
					title="Player DPS vs Enemy HP"
					{labels}
					dualAxis={true}
					datasets={[
						{
							label: 'Effective DPS',
							data: snapshots.map((s) => s.computedDps),
							borderColor: COLORS.dps,
							yAxisID: 'y'
						},
						{
							label: 'Enemy HP',
							data: snapshots.map((s) => s.enemyHp),
							borderColor: COLORS.enemyHp,
							yAxisID: 'y1'
						}
					]}
				/>
				<StatChart
					title="Time-to-Kill (seconds)"
					{labels}
					datasets={[
						{ label: 'TTK', data: snapshots.map((s) => s.timeToKill), borderColor: COLORS.ttk }
					]}
				/>
			</StatGroup>
		</div>
	{/if}
</div>

<style>
	.simulator {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.controls {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	h3 {
		margin: 0 0 12px;
		font-size: 1rem;
	}
	.presets {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}
	.preset-btn {
		padding: 4px 12px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: transparent;
		color: white;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.preset-btn:hover {
		background: rgba(139, 92, 246, 0.3);
	}
	.preset-btn.clear {
		border-color: #ef4444;
		color: #ef4444;
	}
	.add-controls {
		margin-bottom: 8px;
	}
	.add-controls label {
		font-size: 0.85rem;
	}
	.add-controls input {
		width: 60px;
		padding: 2px 6px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: white;
	}
	.search {
		width: 100%;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		margin-bottom: 8px;
		font-size: 0.85rem;
		box-sizing: border-box;
	}
	.upgrade-list {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.upgrade-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 8px;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		border-radius: 4px;
		color: white;
		cursor: pointer;
		font-size: 0.8rem;
		text-align: left;
	}
	.upgrade-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.upgrade-rarity {
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.plan-summary {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		padding: 12px;
	}
	.stage-range {
		margin-bottom: 12px;
	}
	.stage-range label {
		font-size: 0.85rem;
	}
	.stage-range input[type='range'] {
		width: 100%;
	}
	.empty-plan {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
	}
	.plan-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 300px;
		overflow-y: auto;
	}
	.plan-step {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		padding: 2px 4px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}
	.step-level {
		color: #8b5cf6;
		font-weight: 600;
		min-width: 60px;
	}
	.step-upgrade {
		flex: 1;
	}
	.remove-btn {
		background: none;
		border: none;
		color: #ef4444;
		cursor: pointer;
		font-size: 1rem;
		padding: 0 4px;
	}
</style>
