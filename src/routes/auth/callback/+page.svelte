<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	// DECISION: OAuth callback handled as a dedicated route, not in +layout.svelte.
	// Why: OAuth providers redirect here with tokens in the URL hash fragment.
	// Supabase client automatically extracts them on initialization.
	// We just wait for the session, then redirect back to the game.

	const FALLBACK_REDIRECT_MS = 3000;

	onMount(async () => {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			goto('/', { replaceState: true });
			return;
		}
		// Fallback: if no session after brief wait, redirect anyway
		setTimeout(() => goto('/', { replaceState: true }), FALLBACK_REDIRECT_MS);
	});
</script>

<div class="callback-container">
	<p>Signing you in...</p>
</div>

<style>
	.callback-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		color: white;
		font-family: system-ui, sans-serif;
	}
</style>
