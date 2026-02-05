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
	};

	let { show, unlockedUpgrades, onClose, shopPurchaseCounts, lifetimePickCounts }: Props = $props();

	const unlockedCount = $derived(unlockedUpgrades.size);
	const totalCount = allUpgrades.length;
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
						<div class="upgrade-wrapper" class:locked={!isUnlocked}>
							<UpgradeCard
								title={isUnlocked ? upgrade.title : '???'}
								rarity={upgrade.rarity}
								image={upgrade.image}
								modifiers={isUnlocked ? upgrade.modifiers : []}
								shopPurchases={isUnlocked ? (shopPurchaseCounts.get(upgrade.id) ?? 0) : 0}
								lifetimePicks={isUnlocked ? (lifetimePickCounts.get(upgrade.id) ?? 0) : 0}
							/>
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
		transition: transform 0.2s;
	}

	.upgrade-wrapper:hover {
		transform: scale(1.02);
	}

	.upgrade-wrapper.locked {
		filter: grayscale(0.8) brightness(0.5);
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

	@media (max-width: 768px) {
		.upgrades-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
