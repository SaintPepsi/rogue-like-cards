import { describe, test, expect } from 'vitest';
import { writeFileSync } from 'fs';
import {
	getXpToNextLevel,
	getXpReward,
	getEnemyHealth,
	getBossHealth,
	getChestGoldReward,
	getEnemyGoldReward,
	getBossGoldReward,
	KILLS_PER_WAVE,
	BOSS_XP_MULTIPLIER,
} from './waves';
import { getCardPrice } from './shop';

// --- Simulation config ---
type EconomyConfig = {
	label: string;
	xpBase: number;
	goldDropChance: number;
	rarityPrices: Record<string, number>;
};

const LEGACY: EconomyConfig = {
	label: 'Legacy (pre-rebalance)',
	xpBase: 10,
	goldDropChance: 0.15,
	rarityPrices: { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 100 },
};

const CURRENT: EconomyConfig = {
	label: 'Current',
	xpBase: 25,
	goldDropChance: 0.10,
	rarityPrices: { common: 25, uncommon: 50, rare: 100, epic: 175, legendary: 300 },
};

const MAX_STAGE = 30;


type StageResult = {
	stage: number;
	levelUps: number;
	cumulativeLevelUps: number;
	goldEarned: number;
	cumulativeGold: number;
	xpToNext: number;
	level: number;
};

function simulatePlaythrough(config: EconomyConfig): StageResult[] {
	const results: StageResult[] = [];
	let level = 1;
	let xp = 0;
	let cumulativeGold = 0;
	let cumulativeLevelUps = 0;

	for (let stage = 1; stage <= MAX_STAGE; stage++) {
		let stageLevelUps = 0;
		let stageGold = 0;

		// Kill KILLS_PER_WAVE regular enemies
		for (let kill = 0; kill < KILLS_PER_WAVE; kill++) {
			const hp = getEnemyHealth(stage, 0);
			const xpGain = getXpReward(hp, stage, 1);
			xp += xpGain;

			// Gold drop (use expected value = reward * dropChance)
			const goldReward = getEnemyGoldReward(stage, 0, 1);
			stageGold += goldReward * config.goldDropChance;

			// Check level-ups
			for (let i = 0; i < 100 && xp >= getXpToNextLevel(level, config.xpBase); i++) {
				xp -= getXpToNextLevel(level, config.xpBase);
				level++;
				stageLevelUps++;
			}
		}

		// Kill boss
		const bossHp = getBossHealth(stage, 0);
		const bossXp = getXpReward(bossHp, stage, 1, BOSS_XP_MULTIPLIER);
		xp += bossXp;

		const bossGold = getBossGoldReward(stage, 0, 1);
		stageGold += bossGold * config.goldDropChance;

		// Check level-ups after boss
		for (let i = 0; i < 100 && xp >= getXpToNextLevel(level, config.xpBase); i++) {
			xp -= getXpToNextLevel(level, config.xpBase);
			level++;
			stageLevelUps++;
		}

		cumulativeGold += stageGold;
		cumulativeLevelUps += stageLevelUps;

		results.push({
			stage,
			levelUps: stageLevelUps,
			cumulativeLevelUps,
			goldEarned: Math.round(stageGold),
			cumulativeGold: Math.round(cumulativeGold),
			xpToNext: getXpToNextLevel(level, config.xpBase),
			level,
		});
	}
	return results;
}

function generateHtml(current: StageResult[], proposed: StageResult[], configs: { current: EconomyConfig; proposed: EconomyConfig }): string {
	const stages = current.map(r => r.stage);
	const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

	// Cards affordable at each stage for each config
	const cardsAffordable = (results: StageResult[], prices: Record<string, number>) =>
		rarities.map(r => results.map(s => Math.floor(s.cumulativeGold / prices[r])));

	const currentCards = cardsAffordable(current, configs.current.rarityPrices);
	const proposedCards = cardsAffordable(proposed, configs.proposed.rarityPrices);

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Economy Simulation</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>body{font-family:system-ui;background:#1a1a2e;color:white;padding:24px;margin:0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:1400px;margin:0 auto}
canvas{background:rgba(0,0,0,0.3);border-radius:8px;padding:12px}
h1{text-align:center}h2{margin:8px 0}</style></head><body>
<h1>Economy Simulation: Current vs Proposed</h1>
<p style="text-align:center;opacity:0.7">Stages 1-${MAX_STAGE} | ${KILLS_PER_WAVE} enemies + 1 boss per stage | No greed, no XP multiplier</p>
<div class="grid">
<div><h2>1. XP to Next Level (Levels 1-30)</h2><canvas id="c1"></canvas></div>
<div><h2>2. Level-Ups Per Stage</h2><canvas id="c2"></canvas></div>
<div><h2>3. Cumulative Gold Earned</h2><canvas id="c3"></canvas></div>
<div><h2>4. Cumulative Level (Progression)</h2><canvas id="c4"></canvas></div>
<div><h2>5. Cards Affordable (Current Economy)</h2><canvas id="c5"></canvas></div>
<div><h2>6. Cards Affordable (Proposed Economy)</h2><canvas id="c6"></canvas></div>
</div>
<script>
const stages = ${JSON.stringify(stages)};
const cur = ${JSON.stringify(current)};
const prop = ${JSON.stringify(proposed)};
const colors = {current:'#8b5cf6',proposed:'#22d3ee'};
const rarityColors = ['#9ca3af','#22c55e','#3b82f6','#a855f7','#f59e0b'];
const rarityNames = ${JSON.stringify([...rarities])};

function mkChart(id,cfg){new Chart(document.getElementById(id),cfg)}
function line(id,datasets,labels){mkChart(id,{type:'line',data:{labels:labels||stages,datasets:datasets},options:{responsive:true,plugins:{legend:{labels:{color:'white'}}},scales:{x:{ticks:{color:'white'},grid:{color:'rgba(255,255,255,0.1)'}},y:{ticks:{color:'white'},grid:{color:'rgba(255,255,255,0.1)'}}}}})}

// Chart 1: XP to next level
var xpLevels = [];
for(var i=1;i<=30;i++) xpLevels.push(i);
line('c1',[
  {label:'Current (base 10)',data:xpLevels.map(function(l){return Math.floor(10*Math.pow(1.5,l-1))}),borderColor:colors.current,fill:false},
  {label:'Proposed (base 25)',data:xpLevels.map(function(l){return Math.floor(25*Math.pow(1.5,l-1))}),borderColor:colors.proposed,fill:false}
],xpLevels);

// Chart 2: Level-ups per stage
line('c2',[
  {label:'Current',data:cur.map(function(r){return r.levelUps}),borderColor:colors.current,fill:false},
  {label:'Proposed',data:prop.map(function(r){return r.levelUps}),borderColor:colors.proposed,fill:false}
]);

// Chart 3: Cumulative gold
line('c3',[
  {label:'Current (15% drop)',data:cur.map(function(r){return r.cumulativeGold}),borderColor:colors.current,fill:false},
  {label:'Proposed (10% drop)',data:prop.map(function(r){return r.cumulativeGold}),borderColor:colors.proposed,fill:false}
]);

// Chart 4: Cumulative level
line('c4',[
  {label:'Current',data:cur.map(function(r){return r.level}),borderColor:colors.current,fill:false},
  {label:'Proposed',data:prop.map(function(r){return r.level}),borderColor:colors.proposed,fill:false}
]);

// Chart 5: Cards affordable (current economy)
var curCards = ${JSON.stringify(currentCards)};
line('c5',rarityNames.map(function(name,i){return {label:name,data:curCards[i],borderColor:rarityColors[i],fill:false}}));

// Chart 6: Cards affordable (proposed economy)
var propCards = ${JSON.stringify(proposedCards)};
line('c6',rarityNames.map(function(name,i){return {label:name,data:propCards[i],borderColor:rarityColors[i],fill:false}}));
</script></body></html>`;
}

describe('economy simulation', () => {
	const legacy = simulatePlaythrough(LEGACY);
	const current = simulatePlaythrough(CURRENT);

	test('current: stage 1 yields approximately 2-3 level-ups', () => {
		expect(current[0].levelUps).toBeGreaterThanOrEqual(1);
		expect(current[0].levelUps).toBeLessThanOrEqual(3);
	});

	test('current: fewer level-ups than legacy at stage 1', () => {
		expect(current[0].levelUps).toBeLessThan(legacy[0].levelUps);
	});

	test('current: cumulative gold is less than legacy', () => {
		const lastLegacy = legacy[legacy.length - 1];
		const lastCurrent = current[current.length - 1];
		expect(lastCurrent.cumulativeGold).toBeLessThan(lastLegacy.cumulativeGold);
	});

	test('current: common cards are more expensive relative to income', () => {
		const stage10Legacy = legacy[9];
		const stage10Current = current[9];
		const legacyAffordable = stage10Legacy.cumulativeGold / LEGACY.rarityPrices.common;
		const currentAffordable = stage10Current.cumulativeGold / CURRENT.rarityPrices.common;
		expect(currentAffordable).toBeLessThan(legacyAffordable);
	});

	test('generates HTML simulation report', () => {
		const html = generateHtml(legacy, current, { current: LEGACY, proposed: CURRENT });
		const outputPath = 'economy-simulation.html';
		writeFileSync(outputPath, html);
		console.log(`\n📊 Economy simulation report written to: ${outputPath}`);
		console.log('Open in browser to view interactive charts.\n');

		// Sanity: HTML was generated
		expect(html).toContain('chart.js');
		expect(html).toContain('Economy Simulation');
	});

	test('prints summary table', () => {
		console.log('\n--- ECONOMY SIMULATION SUMMARY ---\n');
		console.log('Stage | Leg LvlUps | Cur LvlUps | Leg Gold | Cur Gold  | Leg Lvl | Cur Lvl');
		console.log('------|------------|------------|----------|-----------|---------|--------');
		for (let i = 0; i < legacy.length; i++) {
			const l = legacy[i];
			const c = current[i];
			console.log(
				`${String(l.stage).padStart(5)} | ${String(l.levelUps).padStart(10)} | ${String(c.levelUps).padStart(10)} | ${String(l.cumulativeGold).padStart(8)} | ${String(c.cumulativeGold).padStart(9)} | ${String(l.level).padStart(7)} | ${String(c.level).padStart(6)}`
			);
		}
		console.log('');
		expect(legacy.length).toBe(MAX_STAGE);
	});
});
