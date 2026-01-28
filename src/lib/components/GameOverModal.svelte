<script lang="ts">
	type Props = {
		show: boolean;
		stage: number;
		level: number;
		enemiesKilled: number;
		gold: number;
		onReset: () => void;
		onOpenShop: () => void;
	};

	let { show, stage, level, enemiesKilled, gold, onReset, onOpenShop }: Props = $props();
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal game-over">
			<h2>Game Over</h2>
			<p>The boss defeated you!</p>
			<div class="game-over-stats">
				<p>Stage Reached: <strong>{stage}</strong></p>
				<p>Level: <strong>{level}</strong></p>
				<p>Enemies Killed: <strong>{enemiesKilled}</strong></p>
			</div>
			<p class="gold-display">Gold: <span class="gold-amount">{gold}</span></p>
			<div class="button-row">
				<button class="shop-btn" onclick={onOpenShop}>Buy Cards</button>
				<button class="play-again-btn" onclick={onReset}>Play Again</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: #1a1a2e;
		padding: 32px;
		border-radius: 16px;
		text-align: center;
		max-width: 90vw;
	}

	.modal.game-over h2 {
		color: #ef4444;
		margin: 0 0 8px;
		font-size: 1.8rem;
	}

	.modal p {
		margin: 0 0 16px;
		color: rgba(255, 255, 255, 0.7);
	}

	.game-over-stats {
		text-align: left;
		background: rgba(0, 0, 0, 0.3);
		padding: 16px;
		border-radius: 8px;
		margin: 16px 0;
	}

	.game-over-stats p {
		margin: 8px 0;
		color: rgba(255, 255, 255, 0.8);
	}

	.game-over-stats strong {
		color: #fbbf24;
	}

	.gold-display {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 16px 0;
	}

	.gold-amount {
		color: #fbbf24;
		font-weight: bold;
	}

	.button-row {
		display: flex;
		justify-content: center;
		gap: 12px;
	}

	.shop-btn {
		padding: 12px 24px;
		background: linear-gradient(90deg, #fbbf24, #f59e0b);
		border: none;
		border-radius: 8px;
		color: #1a1a2e;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.shop-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
	}

	.play-again-btn {
		padding: 12px 24px;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.play-again-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
	}
</style>
