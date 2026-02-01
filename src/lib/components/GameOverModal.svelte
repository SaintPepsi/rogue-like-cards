<script lang="ts">
	import { Button } from 'bits-ui';
	type Props = {
		show: boolean;
		stage: number;
		level: number;
		enemiesKilled: number;
		goldEarned: number;
		totalGold: number;
		isLoggedIn: boolean;
		onReset: () => void;
		onOpenShop: () => void;
		onOpenLeaderboard: () => void;
		onOpenLogin: () => void;
	};

	import { formatNumber } from '$lib/format';

	let {
		show,
		stage,
		level,
		enemiesKilled,
		goldEarned,
		totalGold,
		isLoggedIn,
		onReset,
		onOpenShop,
		onOpenLeaderboard,
		onOpenLogin
	}: Props = $props();
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal game-over">
			<h2>Game Over</h2>
			<p>The boss defeated you!</p>
			<div class="game-over-stats">
				<p>Stage Reached: <strong>{stage}</strong></p>
				<p>Level: <strong>{level}</strong></p>
				<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>
				<p>Gold Earned: <strong class="gold-amount">{formatNumber(goldEarned)}</strong></p>
			</div>
			<p class="gold-display">
				Total Gold: <span class="gold-amount">{formatNumber(totalGold)}</span>
			</p>
			{#if isLoggedIn}
				<p class="score-submitted">Score submitted to leaderboard!</p>
			{:else}
				<p class="sign-in-prompt">
					<button class="link-btn" onclick={onOpenLogin}>Sign in</button> to save your score to the leaderboard
				</p>
			{/if}
			<div class="button-row">
				<Button.Root
					class="px-6 py-3 bg-linear-to-r from-[#fbbf24] to-[#f59e0b] border-none rounded-lg text-[#1a1a2e] text-[1.1rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(251,191,36,0.4)]"
					onclick={onOpenShop}>Buy Cards</Button.Root
				>
				<Button.Root
					class="px-6 py-3 bg-linear-to-r from-[#8b5cf6] to-[#a78bfa] border-none rounded-lg text-white text-[1.1rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(139,92,246,0.4)]"
					onclick={onOpenLeaderboard}>Leaderboard</Button.Root
				>
				<Button.Root
					class="px-6 py-3 bg-linear-to-r from-[#22c55e] to-[#16a34a] border-none rounded-lg text-white text-[1.1rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
					onclick={onReset}>Play Again</Button.Root
				>
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
		flex-wrap: wrap;
	}

	.score-submitted {
		color: #4ade80;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.sign-in-prompt {
		font-size: 0.9rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: #a78bfa;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}

	.link-btn:hover {
		color: #c4b5fd;
	}
</style>
