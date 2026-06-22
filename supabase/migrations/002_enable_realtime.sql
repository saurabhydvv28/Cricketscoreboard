-- ============================================================
-- Migration: 002_enable_realtime.sql
-- Description: Enable Supabase Realtime on tables needed for the
--              live public scoreboard (Step 6).
--
-- Run AFTER 001_initial_schema.sql in: Supabase → SQL Editor
--
-- These two tables need Realtime so the public scoreboard page can
-- receive WebSocket push notifications without polling:
--   - matches: receives UPDATE events when live_data changes (every ball)
--   - ball_by_ball_logs: receives INSERT events (every ball logged)
--
-- The supabase_realtime publication is created automatically by
-- Supabase. This just adds our two tables to it.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_by_ball_logs;

-- Verify (optional — these should now show up):
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
