<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';

	interface Props {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Record<string, number>;
	}

	let { choices, onSelect, currentStats }: Props = $props();
</script>

<div
	class="legendary-modal-overlay"
	role="dialog"
	aria-labelledby="legendary-title"
	aria-modal="true"
>
	<div class="legendary-modal">
		<h2 id="legendary-title">Choose Your Starting Legendary</h2>

		<div class="legendary-choices">
			{#each choices as upgrade (upgrade.id)}
				<button
					class="legendary-card-wrapper"
					onclick={() => onSelect(upgrade)}
					data-testid="upgrade-card"
					aria-label={`Select ${upgrade.title}`}
				>
					<UpgradeCard
						title={upgrade.title}
						image={upgrade.image}
						rarity={upgrade.rarity}
						modifiers={upgrade.modifiers}
						{currentStats}
					/>
				</button>
			{/each}
		</div>

		<button
			class="skip-button"
			onclick={() => onSelect(null)}
			aria-label="Skip legendary selection and start game"
		>
			Skip
		</button>
	</div>
</div>

<style>
	.legendary-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.legendary-modal {
		background: linear-gradient(135deg, #1a0033 0%, #0d001a 100%);
		border: 2px solid #ffd700;
		border-radius: 12px;
		padding: 2rem;
		max-width: 90vw;
		box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
		animation: modalEnter 0.3s ease-out;
	}

	@keyframes modalEnter {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	h2 {
		color: #ffd700;
		text-align: center;
		font-size: 2rem;
		margin-bottom: 2rem;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	.legendary-choices {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.legendary-card-wrapper {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: transform 0.2s;
		animation: cardSlideIn 0.4s ease-out backwards;
	}

	.legendary-card-wrapper:hover {
		transform: scale(1.05);
	}

	.legendary-card-wrapper:nth-child(1) {
		animation-delay: 0.1s;
	}

	.legendary-card-wrapper:nth-child(2) {
		animation-delay: 0.2s;
	}

	.legendary-card-wrapper:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes cardSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.skip-button {
		display: block;
		margin: 0 auto;
		padding: 0.75rem 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.skip-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}
</style>
