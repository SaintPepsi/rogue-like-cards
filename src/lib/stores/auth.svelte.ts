import { supabase } from '$lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
	id: string; // Supabase auth user ID (maps to OIDC 'sub' for SpacetimeDB migration)
	email: string;
	displayName: string;
	provider: string; // 'discord' | 'google' | 'email'
	avatarUrl: string | null;
}

// DECISION: Display name stored in Supabase profiles table, not just user_metadata.
// Why: user_metadata is provider-controlled and can change. We want player-chosen names
// that persist across provider changes and are queryable for leaderboard display.

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 20;

function createAuth() {
	let session = $state<Session | null>(null);
	let user = $state<User | null>(null);
	let profile = $state<UserProfile | null>(null);
	let loading = $state(true);
	let showLoginModal = $state(false);
	let showDisplayNameModal = $state(false);

	async function init() {
		const { data } = await supabase.auth.getSession();
		session = data.session;
		user = data.session?.user ?? null;

		if (user) {
			await loadProfile();
		}
		loading = false;

		// Listen for auth changes (login, logout, token refresh)
		supabase.auth.onAuthStateChange(async (_event, newSession) => {
			session = newSession;
			user = newSession?.user ?? null;

			if (user) {
				await loadProfile();
			} else {
				profile = null;
			}
		});
	}

	async function loadProfile() {
		if (!user) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('display_name, avatar_url')
			.eq('id', user.id)
			.single();

		if (error || !data) {
			// New user — needs display name setup
			showDisplayNameModal = true;
			return;
		}

		if (!data.display_name) {
			showDisplayNameModal = true;
			return;
		}

		profile = {
			id: user.id,
			email: user.email ?? '',
			displayName: data.display_name,
			provider: user.app_metadata.provider ?? 'email',
			avatarUrl: data.avatar_url
		};
	}

	async function signInWithDiscord() {
		await supabase.auth.signInWithOAuth({
			provider: 'discord',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
	}

	async function signInWithGoogle() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
	}

	async function signInWithEmail(email: string, password: string): Promise<string | null> {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) return error.message;
		showLoginModal = false;
		return null;
	}

	async function signUpWithEmail(email: string, password: string): Promise<string | null> {
		const { error } = await supabase.auth.signUp({ email, password });
		if (error) return error.message;
		showLoginModal = false;
		return null;
	}

	async function signOut() {
		await supabase.auth.signOut();
		session = null;
		user = null;
		profile = null;
	}

	async function setDisplayName(name: string): Promise<string | null> {
		if (!user) return 'Not logged in';

		const trimmed = name.trim();
		if (trimmed.length < DISPLAY_NAME_MIN_LENGTH || trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
			return `Display name must be ${DISPLAY_NAME_MIN_LENGTH}-${DISPLAY_NAME_MAX_LENGTH} characters`;
		}

		const { error } = await supabase.from('profiles').upsert({
			id: user.id,
			display_name: trimmed,
			avatar_url: user.user_metadata.avatar_url ?? null,
			updated_at: new Date().toISOString()
		});

		if (error) return error.message;

		profile = {
			id: user.id,
			email: user.email ?? '',
			displayName: trimmed,
			provider: user.app_metadata.provider ?? 'email',
			avatarUrl: user.user_metadata.avatar_url ?? null
		};
		showDisplayNameModal = false;
		return null;
	}

	return {
		get session() {
			return session;
		},
		get user() {
			return user;
		},
		get profile() {
			return profile;
		},
		get loading() {
			return loading;
		},
		get isLoggedIn() {
			return !!session && !!profile;
		},
		get showLoginModal() {
			return showLoginModal;
		},
		set showLoginModal(v: boolean) {
			showLoginModal = v;
		},
		get showDisplayNameModal() {
			return showDisplayNameModal;
		},
		set showDisplayNameModal(v: boolean) {
			showDisplayNameModal = v;
		},

		init,
		signInWithDiscord,
		signInWithGoogle,
		signInWithEmail,
		signUpWithEmail,
		signOut,
		setDisplayName
	};
}

export const auth = createAuth();
