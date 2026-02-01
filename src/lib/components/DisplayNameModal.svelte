<script lang="ts">
	import { Button } from 'bits-ui';
	import { auth } from '$lib/stores/auth.svelte';

	type Props = {
		show: boolean;
	};

	let { show }: Props = $props();

	let displayName = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function handleSubmit() {
		if (submitting) return;
		submitting = true;
		errorMessage = '';

		const error = await auth.setDisplayName(displayName);
		if (error) {
			errorMessage = error;
		}
		submitting = false;
	}
</script>

{#if show}
	<div class="modal-overlay" role="dialog">
		<div class="modal">
			<div class="modal-header">
				<h2>Choose Your Name</h2>
			</div>
			<div class="modal-content">
				<p class="subtitle">This name will appear on the leaderboard.</p>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<input
						type="text"
						placeholder="Display name (2-20 chars)"
						bind:value={displayName}
						class="input-field"
						minlength="2"
						maxlength="20"
						required
					/>
					{#if errorMessage}
						<p class="error">{errorMessage}</p>
					{/if}
					<Button.Root
						class="w-full py-3 bg-linear-to-r from-[#8b5cf6] to-[#a78bfa] border-none rounded-[10px] text-white text-[1rem] font-semibold cursor-pointer transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(139,92,246,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
						type="submit"
						disabled={submitting}
					>
						Confirm
					</Button.Root>
				</form>
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
		z-index: 150;
		padding: 20px;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		max-width: 400px;
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
		font-size: 1.3rem;
		color: white;
		flex: 1;
	}

	.modal-content {
		padding: 20px 24px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.subtitle {
		margin: 0;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.input-field {
		width: 100%;
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		color: white;
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.input-field:focus {
		border-color: rgba(167, 139, 250, 0.5);
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.error {
		margin: 0;
		color: #f87171;
		font-size: 0.85rem;
	}
</style>
