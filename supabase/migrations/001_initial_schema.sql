-- ============================================================
-- Migration: 001_initial_schema.sql
-- Description: Complete initial schema for Local Cricket Scoreboard
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed');

CREATE TYPE extra_type AS ENUM ('wide', 'no_ball', 'bye', 'leg_bye', 'none');

CREATE TYPE wicket_type AS ENUM (
  'bowled',
  'caught',
  'lbw',
  'run_out',
  'stumped',
  'hit_wicket',
  'obstructing_field',
  'timed_out',
  'handled_ball'
);

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- ----------------------------
-- 2.1 profiles
-- ----------------------------
-- Extends Supabase auth.users. One row per registered user.
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  player_id     TEXT UNIQUE NOT NULL, -- human-readable slug e.g. "virat-k-42"
  avatar_url    TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.profiles.player_id IS
  'Human-readable unique slug used by admins to search/select players when assembling teams.';

-- ----------------------------
-- 2.2 matches
-- ----------------------------
CREATE TABLE public.matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_name       TEXT NOT NULL,
  team_b_name       TEXT NOT NULL,
  team_a_roster     UUID[] NOT NULL DEFAULT '{}', -- array of profiles.id
  team_b_roster     UUID[] NOT NULL DEFAULT '{}', -- array of profiles.id
  status            match_status NOT NULL DEFAULT 'scheduled',
  total_overs       INTEGER NOT NULL CHECK (total_overs > 0),
  toss_winner       TEXT,                          -- 'team_a' | 'team_b'
  toss_decision     TEXT,                          -- 'bat' | 'bowl'
  current_innings   INTEGER NOT NULL DEFAULT 1 CHECK (current_innings IN (1, 2)),
  -- 1st innings final scores (populated after innings 1 ends)
  innings1_score    INTEGER,
  innings1_wickets  INTEGER,
  innings1_overs    NUMERIC(5,1),
  -- live_data JSONB: volatile real-time state for instant scoreboard rendering
  -- Shape: {
  --   striker_id: uuid | null,
  --   non_striker_id: uuid | null,
  --   bowler_id: uuid | null,
  --   score: number,
  --   wickets: number,
  --   overs: string,          -- e.g. "5.4"
  --   current_over_balls: BallSummary[],
  --   run_rate: number,
  --   required_run_rate: number | null,
  --   target: number | null
  -- }
  live_data         JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.matches.live_data IS
  'Volatile scoreboard state updated on every ball. Avoids expensive joins for public scoreboard reads.';

-- ----------------------------
-- 2.3 ball_by_ball_logs
-- ----------------------------
CREATE TABLE public.ball_by_ball_logs (
  id                  BIGSERIAL PRIMARY KEY,
  match_id            UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings             INTEGER NOT NULL CHECK (innings IN (1, 2)),
  over_number         INTEGER NOT NULL,   -- 0-indexed (over 1 = 0, over 2 = 1 …)
  ball_number         INTEGER NOT NULL,   -- 1–6 for legal deliveries only
  is_legal_delivery   BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE for wides & no-balls
  batsman_id          UUID NOT NULL REFERENCES public.profiles(id),
  bowler_id           UUID NOT NULL REFERENCES public.profiles(id),
  runs_scored         INTEGER NOT NULL DEFAULT 0 CHECK (runs_scored >= 0),
  extra_runs          INTEGER NOT NULL DEFAULT 0 CHECK (extra_runs >= 0),
  extra_type          extra_type NOT NULL DEFAULT 'none',
  is_wicket           BOOLEAN NOT NULL DEFAULT FALSE,
  wicket_type         wicket_type,
  player_dismissed_id UUID REFERENCES public.profiles(id),
  fielder_id          UUID REFERENCES public.profiles(id), -- for caught/run-out/stumped
  commentary          TEXT,                                -- optional admin note
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate legal ball entries
  CONSTRAINT unique_legal_ball UNIQUE NULLS NOT DISTINCT (match_id, innings, over_number, ball_number, is_legal_delivery)
);

CREATE INDEX idx_bbl_match_innings ON public.ball_by_ball_logs(match_id, innings);
CREATE INDEX idx_bbl_batsman ON public.ball_by_ball_logs(batsman_id);
CREATE INDEX idx_bbl_bowler ON public.ball_by_ball_logs(bowler_id);

-- ============================================================
-- SECTION 3: HELPER FUNCTION FOR RLS (avoids recursion)
-- ============================================================

-- Returns TRUE if the calling auth.uid() has is_admin = true in profiles.
-- SECURITY DEFINER so it can read profiles table bypassing RLS during the check.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- ============================================================
-- SECTION 4: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_by_ball_logs ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- Anyone authenticated can read all profiles (needed for player search)
CREATE POLICY "profiles_read_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- A user can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile (e.g., to grant admin rights)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ---- matches ----
-- Public read (even anon)
CREATE POLICY "matches_read_public"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only admins can insert/update/delete
CREATE POLICY "matches_write_admin"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "matches_update_admin"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "matches_delete_admin"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---- ball_by_ball_logs ----
-- Public read
CREATE POLICY "bbl_read_public"
  ON public.ball_by_ball_logs FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only admins can insert
CREATE POLICY "bbl_insert_admin"
  ON public.ball_by_ball_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can update (corrections)
CREATE POLICY "bbl_update_admin"
  ON public.ball_by_ball_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Only admins can delete (undo last ball)
CREATE POLICY "bbl_delete_admin"
  ON public.ball_by_ball_logs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- SECTION 5: AUTH TRIGGER — Auto-create profile on signup
-- ============================================================

-- Generates a URL-safe slug from the user's full_name + random suffix
CREATE OR REPLACE FUNCTION public.generate_player_id(full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base      TEXT;
  candidate TEXT;
  suffix    TEXT;
  exists    BOOLEAN;
BEGIN
  -- Lowercase, replace spaces with hyphens, strip non-alphanumeric except hyphens
  base := regexp_replace(
            regexp_replace(lower(trim(full_name)), '[^a-z0-9 ]', '', 'g'),
            '\s+', '-', 'g'
          );
  -- Truncate to first two hyphen-separated words for brevity
  base := array_to_string((string_to_array(base, '-'))[1:2], '-');
  IF base = '' OR base IS NULL THEN base := 'player'; END IF;

  -- Try up to 10 times to find a unique ID
  FOR i IN 1..10 LOOP
    suffix    := lpad(floor(random() * 9000 + 1000)::TEXT, 4, '0');
    candidate := base || '-' || suffix;
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE player_id = candidate) INTO exists;
    IF NOT exists THEN
      RETURN candidate;
    END IF;
  END LOOP;

  -- Fallback: uuid prefix
  RETURN 'player-' || left(gen_random_uuid()::TEXT, 8);
END;
$$;

-- Trigger function: fires after a new row is inserted into auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_name TEXT;
BEGIN
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, full_name, player_id)
  VALUES (
    NEW.id,
    full_name,
    public.generate_player_id(full_name)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SECTION 6: updated_at TRIGGER for matches
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SECTION 7: LEADERBOARD VIEWS
-- ============================================================
-- All aggregated numeric fields are explicitly CAST to INTEGER / NUMERIC
-- to prevent BigInt serialization issues in Next.js SSR.

-- ----------------------------
-- 7.1 Base batting stats view
-- ----------------------------
CREATE OR REPLACE VIEW public.v_batting_stats AS
SELECT
  b.batsman_id                                                       AS player_id,
  p.full_name,
  p.player_id                                                        AS player_slug,
  p.avatar_url,
  CAST(SUM(b.runs_scored) AS INTEGER)                                AS total_runs,
  CAST(COUNT(*) FILTER (WHERE b.is_legal_delivery)  AS INTEGER)      AS balls_faced,
  CAST(COUNT(*) FILTER (WHERE b.runs_scored = 4)    AS INTEGER)      AS fours,
  CAST(COUNT(*) FILTER (WHERE b.runs_scored = 6)    AS INTEGER)      AS sixes,
  CAST(COUNT(DISTINCT b.match_id)                   AS INTEGER)      AS matches_played,
  CASE
    WHEN COUNT(*) FILTER (WHERE b.is_legal_delivery) = 0 THEN 0
    ELSE CAST(
      ROUND(
        (SUM(b.runs_scored)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE b.is_legal_delivery), 0)) * 100,
        2
      ) AS NUMERIC
    )
  END                                                                AS strike_rate
FROM public.ball_by_ball_logs b
JOIN public.profiles p ON p.id = b.batsman_id
GROUP BY b.batsman_id, p.full_name, p.player_id, p.avatar_url;

-- ----------------------------
-- 7.2 Base bowling stats view
-- ----------------------------
CREATE OR REPLACE VIEW public.v_bowling_stats AS
SELECT
  b.bowler_id                                                         AS player_id,
  p.full_name,
  p.player_id                                                         AS player_slug,
  p.avatar_url,
  CAST(COUNT(DISTINCT b.match_id)                    AS INTEGER)      AS matches_played,
  -- Legal deliveries as full overs + remainder
  CAST(COUNT(*) FILTER (WHERE b.is_legal_delivery)   AS INTEGER)      AS legal_balls,
  CAST(
    FLOOR(COUNT(*) FILTER (WHERE b.is_legal_delivery) / 6) AS INTEGER
  )                                                                   AS full_overs,
  CAST(
    MOD(COUNT(*) FILTER (WHERE b.is_legal_delivery), 6) AS INTEGER
  )                                                                   AS remaining_balls,
  CAST(
    COUNT(*) FILTER (WHERE b.is_wicket AND b.wicket_type NOT IN ('run_out')) AS INTEGER
  )                                                                   AS wickets,
  CAST(SUM(b.runs_scored + b.extra_runs)             AS INTEGER)      AS runs_conceded,
  CASE
    WHEN COUNT(*) FILTER (WHERE b.is_legal_delivery) < 6 THEN NULL
    ELSE CAST(
      ROUND(
        (SUM(b.runs_scored + b.extra_runs)::NUMERIC
          / NULLIF(COUNT(*) FILTER (WHERE b.is_legal_delivery), 0)) * 6,
        2
      ) AS NUMERIC
    )
  END                                                                 AS economy_rate
FROM public.ball_by_ball_logs b
JOIN public.profiles p ON p.id = b.bowler_id
GROUP BY b.bowler_id, p.full_name, p.player_id, p.avatar_url;

-- ----------------------------
-- 7.3 Orange Cap — Top 5 Most Runs
-- ----------------------------
CREATE OR REPLACE VIEW public.v_leaderboard_orange_cap AS
SELECT
  ROW_NUMBER() OVER (ORDER BY total_runs DESC, strike_rate DESC) AS rank,
  player_id,
  full_name,
  player_slug,
  avatar_url,
  total_runs,
  balls_faced,
  fours,
  sixes,
  matches_played,
  strike_rate
FROM public.v_batting_stats
ORDER BY total_runs DESC, strike_rate DESC
LIMIT 5;

-- ----------------------------
-- 7.4 Purple Cap — Top 5 Most Wickets
-- ----------------------------
CREATE OR REPLACE VIEW public.v_leaderboard_purple_cap AS
SELECT
  ROW_NUMBER() OVER (ORDER BY wickets DESC, economy_rate ASC NULLS LAST) AS rank,
  player_id,
  full_name,
  player_slug,
  avatar_url,
  matches_played,
  wickets,
  runs_conceded,
  full_overs,
  remaining_balls,
  economy_rate
FROM public.v_bowling_stats
ORDER BY wickets DESC, economy_rate ASC NULLS LAST
LIMIT 5;

-- ----------------------------
-- 7.5 Highest Strike Rate (min 20 balls faced)
-- ----------------------------
CREATE OR REPLACE VIEW public.v_leaderboard_strike_rate AS
SELECT
  ROW_NUMBER() OVER (ORDER BY strike_rate DESC) AS rank,
  player_id,
  full_name,
  player_slug,
  avatar_url,
  total_runs,
  balls_faced,
  matches_played,
  strike_rate
FROM public.v_batting_stats
WHERE balls_faced >= 20
ORDER BY strike_rate DESC
LIMIT 5;

-- ----------------------------
-- 7.6 Best Economy Rate (min 4 overs = 24 legal balls)
-- ----------------------------
CREATE OR REPLACE VIEW public.v_leaderboard_economy_rate AS
SELECT
  ROW_NUMBER() OVER (ORDER BY economy_rate ASC) AS rank,
  player_id,
  full_name,
  player_slug,
  avatar_url,
  wickets,
  runs_conceded,
  full_overs,
  remaining_balls,
  matches_played,
  economy_rate
FROM public.v_bowling_stats
WHERE legal_balls >= 24   -- minimum 4 complete overs
  AND economy_rate IS NOT NULL
ORDER BY economy_rate ASC
LIMIT 5;

-- ============================================================
-- SECTION 8: REALTIME — Enable for live scoreboard
-- ============================================================
-- Enable Supabase Realtime on the tables that need live updates.
-- Run these in the Supabase Dashboard → Database → Replication
-- OR uncomment and run here (requires supabase_realtime publication to exist).

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_by_ball_logs;

-- ============================================================
-- SECTION 9: GRANT permissions to anon/authenticated roles
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.profiles             TO authenticated;
GRANT UPDATE ON public.profiles             TO authenticated;

GRANT SELECT ON public.matches              TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.matches TO authenticated;

GRANT SELECT ON public.ball_by_ball_logs    TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ball_by_ball_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ball_by_ball_logs_id_seq TO authenticated;

-- Views (read-only for everyone)
GRANT SELECT ON public.v_batting_stats          TO anon, authenticated;
GRANT SELECT ON public.v_bowling_stats          TO anon, authenticated;
GRANT SELECT ON public.v_leaderboard_orange_cap TO anon, authenticated;
GRANT SELECT ON public.v_leaderboard_purple_cap TO anon, authenticated;
GRANT SELECT ON public.v_leaderboard_strike_rate TO anon, authenticated;
GRANT SELECT ON public.v_leaderboard_economy_rate TO anon, authenticated;

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
