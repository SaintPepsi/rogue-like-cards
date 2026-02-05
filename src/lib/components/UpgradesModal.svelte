<script lang="ts">
	import { allUpgrades } from '$lib/data/upgrades';
	import { Button } from 'bits-ui';
	import UpgradeCard from './UpgradeCard.svelte';

	type Props = {
		show: boolean;
		unlockedUpgrades: Set<string>;
		onClose: () => void;
		shopPurchaseCounts: Map<string, number>;
		lifetimePickCounts: Map<string, number>;
		runPickCounts: Map<string, number>;
	};

	let {
		show,
		unlockedUpgrades,
		onClose,
		shopPurchaseCounts,
		lifetimePickCounts,
		runPickCounts
	}: Props = $props();

	const unlockedCount = $derived(unlockedUpgrades.size);
	const totalCount = allUpgrades.length;

	// Track which cards are flipped (showing stats on back)
	let flippedCards = $state<Set<string>>(new Set());

	function toggleCardFlip(upgradeId: string) {
		if (flippedCards.has(upgradeId)) {
			flippedCards = new Set([...flippedCards].filter((id) => id !== upgradeId));
		} else {
			flippedCards = new Set([...flippedCards, upgradeId]);
		}
	}
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
			role="dialog"
			tabindex="0"
		>
			<div class="modal-header">
				<h2>Upgrades Collection</h2>
				<span class="progress">{unlockedCount}/{totalCount} Discovered</span>
				<Button.Root
					class="ml-auto bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
					onclick={onClose}>&times;</Button.Root
				>
			</div>
			<div class="modal-content">
				<div class="upgrades-grid">
					{#each allUpgrades as upgrade (upgrade.id)}
						{@const isUnlocked = unlockedUpgrades.has(upgrade.id)}
						{@const isFlipped = flippedCards.has(upgrade.id)}
						{@const shopCount = shopPurchaseCounts.get(upgrade.id) ?? 0}
						{@const runCount = runPickCounts.get(upgrade.id) ?? 0}
						{@const lifetimeCount = lifetimePickCounts.get(upgrade.id) ?? 0}
						<div class="upgrade-wrapper" class:locked={!isUnlocked} class:flippable={isUnlocked}>
							<button
								class="card-flip-wrapper"
								class:flipped={isFlipped}
								onclick={() => isUnlocked && toggleCardFlip(upgrade.id)}
								disabled={!isUnlocked}
								type="button"
							>
								<!-- Card Front -->
								<div class="card-face card-front">
									<UpgradeCard
										title={isUnlocked ? upgrade.title : '???'}
										rarity={upgrade.rarity}
										image={upgrade.image}
										modifiers={isUnlocked ? upgrade.modifiers : []}
										shopPurchases={isUnlocked ? shopCount : 0}
										lifetimePicks={isUnlocked ? lifetimeCount : 0}
										runPicks={isUnlocked ? runCount : 0}
									/>
								</div>

								<!-- Card Back (Stats Explanation) -->
								<div class="card-face card-back">
									<div class="stats-explanation">
										<h3>{upgrade.title}</h3>
										<div class="stats-list">
											<div class="stat-row">
												<span class="stat-icon">🛒</span>
												<div class="stat-info">
													<span class="stat-label">Shop Purchases</span>
													<span class="stat-description">Times bought from shop</span>
												</div>
												<span class="stat-value">{shopCount}</span>
											</div>
											<div class="stat-row">
												<span class="stat-icon">▶</span>
												<div class="stat-info">
													<span class="stat-label">Current Run Picks</span>
													<span class="stat-description">Picked during this run</span>
												</div>
												<span class="stat-value">{runCount}</span>
											</div>
											<div class="stat-row">
												<span class="stat-icon">🏆</span>
												<div class="stat-info">
													<span class="stat-label">Lifetime Picks</span>
													<span class="stat-description">Total picks across all runs</span>
												</div>
												<span class="stat-value">{lifetimeCount}</span>
											</div>
										</div>
										<p class="hint">Click to flip back</p>
									</div>
								</div>
							</button>

							{#if !isUnlocked}
								<div class="lock-overlay">
									<span class="lock-icon">🔒</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 20px;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		max-width: 900px;
		max-height: 80vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #fbbf24;
	}

	.progress {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.modal-content {
		padding: 24px;
		overflow-y: auto;
	}

	.upgrades-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
	}

	.upgrade-wrapper {
		position: relative;
		perspective: 1000px;
	}

	.upgrade-wrapper.flippable {
		cursor: pointer;
	}

	.upgrade-wrapper.locked {
		filter: grayscale(0.8) brightness(0.5);
	}

	.card-flip-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.6s;
		border: none;
		background: none;
		padding: 0;
		cursor: inherit;
	}

	.card-flip-wrapper:disabled {
		cursor: default;
	}

	.upgrade-wrapper:not(.locked) .card-flip-wrapper:hover {
		transform: scale(1.02);
	}

	.card-flip-wrapper.flipped {
		transform: rotateY(180deg);
	}

	.card-face {
		width: 100%;
		height: 100%;
		position: absolute;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.card-front {
		z-index: 2;
		transform: rotateY(0deg);
	}

	.card-back {
		transform: rotateY(180deg);
	}

	.lock-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.lock-icon {
		font-size: 2rem;
		opacity: 0.8;
	}

	.stats-explanation {
		background: linear-gradient(135deg, #1a1525 0%, #2d2438 100%);
		border: 2px solid #6b7280;
		border-radius: 8px;
		padding: 16px;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
		color: white;
	}

	.stats-explanation h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		color: #fbbf24;
	}

	.stats-list {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.stat-icon {
		font-size: 1.2rem;
	}

	.stat-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	.stat-description {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.stat-value {
		font-size: 1.2rem;
		font-weight: 700;
		color: #fbbf24;
		min-width: 24px;
		text-align: right;
	}

	.hint {
		margin: 0;
		text-align: center;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.upgrades-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
