-- Supabase Schema for Authentication + Leaderboard
-- Run this in the Supabase SQL Editor after creating your project.
--
-- DECISION: Separate profiles table instead of relying on auth.users metadata.
-- Why: auth.users is managed by Supabase Auth and has restricted access patterns.
-- Profiles table allows RLS, custom columns, and direct queries from the client.
-- For SpacetimeDB migration: export id + display_name as the identity mapping.

-- ============================================================
-- Profiles table (auto-populated on first sign-in via trigger)
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile row on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Leaderboard entries table
-- ============================================================

CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    stage INTEGER NOT NULL,
    level INTEGER NOT NULL,
    enemies_killed INTEGER NOT NULL,
    gold_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PERFORMANCE: Index for time-filtered leaderboard queries sorted by stage desc
CREATE INDEX idx_leaderboard_created_at_stage
    ON leaderboard_entries (created_at DESC, stage DESC);

CREATE INDEX idx_leaderboard_user_id
    ON leaderboard_entries (user_id);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Leaderboard entries are viewable by everyone"
    ON leaderboard_entries FOR SELECT USING (true);

-- Users can only insert their own entries
CREATE POLICY "Users can insert their own leaderboard entries"
    ON leaderboard_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- SECURITY: Rate limiting via database function to prevent spam submissions.
-- Max 1 submission per 30 seconds per user.
CREATE OR REPLACE FUNCTION check_submission_rate()
RETURNS TRIGGER AS $$
DECLARE
    last_submission TIMESTAMPTZ;
BEGIN
    SELECT created_at INTO last_submission
    FROM leaderboard_entries
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_submission IS NOT NULL AND last_submission > now() - INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'Rate limited: please wait before submitting again';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_submission_rate
    BEFORE INSERT ON leaderboard_entries
    FOR EACH ROW EXECUTE FUNCTION check_submission_rate();
