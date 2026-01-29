<script lang="ts">
	type Props = {
		show: boolean;
		onClose: () => void;
	};

	let { show, onClose }: Props = $props();
</script>

{#if show}
	<div class="modal-overlay" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="button" tabindex="0">
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog">
			<div class="modal-header">
				<h2>Changelog</h2>
				<button class="close-btn" onclick={onClose}>&times;</button>
			</div>
			<div class="modal-content">
				<div class="version-entry">
					<h3>v0.3.1</h3>
					<ul>
						<li><span class="tag new">New</span> Executioner's Pact: buy to raise your execute cap beyond 10% (death shop only)</li>
						<li><span class="tag change">Changed</span> Execute reworked: now a % chance to instantly kill on any hit instead of a health threshold</li>
						<li><span class="tag change">Changed</span> Execute upgrades stack additively and cap at 10% (expandable via Executioner's Pact)</li>
						<li><span class="tag change">Changed</span> Execute cards no longer appear once you hit your current cap</li>
					</ul>
				</div>
				<div class="version-entry">
					<h3>v0.3.0</h3>
					<ul>
						<li><span class="tag new">New</span> Mobile card carousel for shop and upgrade selection</li>
					</ul>
				</div>
				<div class="version-entry">
					<h3>v0.2.0</h3>
					<ul>
						<li><span class="tag new">New</span> Initial release with combat, upgrades, shop, and boss fights</li>
					</ul>
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
		max-width: 600px;
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
		flex: 1;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 2rem;
		cursor: pointer;
		line-height: 1;
		padding: 0;
	}

	.close-btn:hover {
		color: white;
	}

	.modal-content {
		padding: 24px;
		overflow-y: auto;
	}

	.version-entry {
		margin-bottom: 24px;
	}

	.version-entry:last-child {
		margin-bottom: 0;
	}

	.version-entry h3 {
		margin: 0 0 8px;
		font-size: 1.1rem;
		color: #a78bfa;
	}

	.version-entry ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.version-entry li {
		padding: 6px 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.4;
	}

	.tag {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		margin-right: 6px;
		text-transform: uppercase;
	}

	.tag.new {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
	}

	.tag.change {
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}
</style>
