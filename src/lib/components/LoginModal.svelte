<script lang="ts">
	import { Button } from 'bits-ui';
	import { auth } from '$lib/stores/auth.svelte';

	type Props = {
		show: boolean;
		onClose: () => void;
	};

	let { show, onClose }: Props = $props();

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function handleEmailSubmit() {
		if (submitting) return;
		submitting = true;
		errorMessage = '';

		const error =
			mode === 'login'
				? await auth.signInWithEmail(email, password)
				: await auth.signUpWithEmail(email, password);

		if (error) {
			errorMessage = error;
			submitting = false;
			return;
		}

		submitting = false;
		handleClose();
	}

	function handleClose() {
		errorMessage = '';
		email = '';
		password = '';
		mode = 'login';
		onClose();
	}
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
			role="dialog"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
				<Button.Root
					class="bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
					onclick={handleClose}>&times;</Button.Root
				>
			</div>
			<div class="modal-content">
				<p class="subtitle">Sign in to submit scores to the leaderboard</p>

				<!-- OAuth Buttons -->
				<button class="oauth-btn discord" onclick={() => auth.signInWithDiscord()}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
						/>
					</svg>
					Sign in with Discord
				</button>

				<button class="oauth-btn google" onclick={() => auth.signInWithGoogle()}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Sign in with Google
				</button>

				<div class="divider"><span>or</span></div>

				<!-- Email form -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleEmailSubmit();
					}}
				>
					<input type="email" placeholder="Email" bind:value={email} class="input-field" required />
					<input
						type="password"
						placeholder="Password"
						bind:value={password}
						class="input-field"
						minlength="6"
						required
					/>
					{#if errorMessage}
						<p class="error">{errorMessage}</p>
					{/if}
					<button class="submit-btn" type="submit" disabled={submitting}>
						{mode === 'login' ? 'Sign In' : 'Create Account'}
					</button>
				</form>

				<p class="toggle-mode">
					{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
					<button
						class="link-btn"
						onclick={() => {
							mode = mode === 'login' ? 'signup' : 'login';
							errorMessage = '';
						}}
					>
						{mode === 'login' ? 'Sign Up' : 'Sign In'}
					</button>
				</p>
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
		text-align: center;
	}

	.oauth-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.oauth-btn.discord {
		background: rgba(88, 101, 242, 0.15);
		color: #7289da;
		border-color: rgba(88, 101, 242, 0.25);
	}

	.oauth-btn.discord:hover {
		background: rgba(88, 101, 242, 0.25);
		color: white;
	}

	.oauth-btn.google {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.85);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.oauth-btn.google:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.8rem;
		margin: 4px 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 10px;
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

	.submit-btn {
		width: 100%;
		padding: 12px;
		background: linear-gradient(to right, #8b5cf6, #a78bfa);
		border: none;
		border-radius: 10px;
		color: white;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}

	.submit-btn:hover:not(:disabled) {
		transform: scale(1.02);
		box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.toggle-mode {
		margin: 4px 0 0;
		text-align: center;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.link-btn {
		background: none;
		border: none;
		color: #a78bfa;
		font-size: 0.85rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}

	.link-btn:hover {
		color: #c4b5fd;
	}
</style>
