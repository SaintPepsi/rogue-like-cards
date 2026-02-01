import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// DECISION: Single shared Supabase client instance for the entire app.
// Why: Supabase JS client manages its own session state and token refresh internally.
// One instance avoids duplicate auth listeners and token refresh races.
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
