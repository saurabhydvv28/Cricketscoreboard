-- ============================================================
-- Migration: 003_no_auth_profiles.sql
-- Description: Decouple profiles from Supabase Auth so the admin
--              can create player profiles directly without requiring
--              each player to sign up with email/password.
--
-- This app uses a simple PIN-based admin session (ADMIN_PIN env var)
-- rather than Supabase Auth. Players don't need accounts at all —
-- the admin creates their profiles from the admin panel.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Drop the foreign key constraint linking profiles to auth.users
--    so profiles can exist independently of auth accounts.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Change the id column to use gen_random_uuid() as default
--    (previously it had no default, relying on auth.users to provide it)
ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Drop the auth trigger (no longer needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Update RLS policies — profiles are now fully public-readable
--    and admin-writable. Since we're not using Supabase Auth sessions,
--    we use the service role key (set via SUPABASE_SERVICE_ROLE_KEY
--    env var) for all admin writes, which bypasses RLS entirely.
--    Public reads still work with the anon key.

-- Drop old auth-dependent policies
DROP POLICY IF EXISTS "profiles_read_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Allow anyone to read profiles (needed for public player directory,
-- leaderboards, match rosters shown to public viewers)
CREATE POLICY "profiles_read_public"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Insert/Update/Delete are done via the service role key in server
-- actions, which bypasses RLS. No permissive INSERT policy needed
-- for anon/authenticated since players don't create their own profiles.

-- 5. Similarly update matches and ball_by_ball_logs to be readable
--    by anon (for public scoreboard without login)
DROP POLICY IF EXISTS "matches_read_public" ON public.matches;
CREATE POLICY "matches_read_public_anon"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "bbl_read_public" ON public.ball_by_ball_logs;
CREATE POLICY "bbl_read_public_anon"
  ON public.ball_by_ball_logs FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- 6. Grant anon access to profiles for public read
GRANT SELECT ON public.profiles TO anon;

-- 7. Ensure the generate_player_id function still works
--    (it doesn't depend on auth, so it's fine as-is)

-- Done. After running this:
-- - Use SUPABASE_SERVICE_ROLE_KEY in server actions for all writes
-- - Use NEXT_PUBLIC_SUPABASE_ANON_KEY for public reads
-- - Set ADMIN_PIN env var for admin authentication
