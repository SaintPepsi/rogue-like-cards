# Supabase Setup Guide

This guide walks through setting up the authentication and leaderboard backend.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and choose a name/region
3. Save the **Project URL** and **anon public key** from Settings > API

## 2. Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

```
PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

For production, add the same variables in **Vercel > Project Settings > Environment Variables** for all environments (Production, Preview, Development).

## 3. Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor**
2. Paste the contents of `supabase-schema.sql` from the repo root
3. Click **Run**

This creates:

- `profiles` table with auto-population trigger on signup
- `leaderboard_entries` table with rate limiting (1 per 30s per user)
- Row Level Security policies (public read, authenticated insert-own-only)
- Performance indexes for time-filtered queries

## 4. Configure Auth Providers

### Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application
3. Under OAuth2, add redirect URLs:
   - `http://localhost:5173/auth/callback` (local dev)
   - `https://your-production-domain.com/auth/callback` (production)
4. Copy the **Client ID** and **Client Secret**
5. In Supabase dashboard: **Authentication > Providers > Discord**
   - Enable it
   - Paste Client ID and Client Secret

### Google

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (local dev)
   - `https://your-production-domain.com/auth/callback` (production)
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase's own callback)
4. Copy the **Client ID** and **Client Secret**
5. In Supabase dashboard: **Authentication > Providers > Google**
   - Enable it
   - Paste Client ID and Client Secret

### Email + Password

Enabled by default in Supabase. No extra setup needed.

Optionally, under **Authentication > Settings**:

- Disable email confirmation for faster dev iteration
- Configure the email templates if you want branded emails

## 5. Verify Setup

1. Run `npm run dev`
2. Click "Sign In" in the game header
3. Try signing in with Discord, Google, or email
4. After login, you should be prompted to choose a display name
5. Play a game, die or give up, and check the leaderboard

## Troubleshooting

**OAuth redirects to wrong URL**: Make sure the redirect URLs in both the provider dashboard (Discord/Google) and Supabase match exactly, including the `/auth/callback` path.

**"Row Level Security" errors on insert**: Verify you ran the full `supabase-schema.sql` including the RLS policies. Check that the user is authenticated (has a valid session).

**Profile not created on signup**: The `on_auth_user_created` trigger may not have been created. Re-run the trigger section of the SQL schema.

**Rate limit errors on score submission**: The schema enforces a 30-second cooldown between submissions per user. This is intentional to prevent spam.
