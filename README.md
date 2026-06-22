# 🏏 Local Cricket Match Scoreboard

A real-time cricket scoring web application built with **Next.js 14**, **Supabase**, and hand-built shadcn-style components.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn-style components |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Real-time | Supabase Realtime (WebSocket subscriptions) |

---

## Project Structure

```
cricket-scoreboard/
├── memory.md                          # AI session continuity file — read first!
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql     # Run this first in Supabase SQL Editor
├── src/
│   ├── app/                           # Next.js App Router pages
│   │   ├── auth/                      # Email confirmation callback + error page
│   │   ├── admin/                     # Admin dashboard (protected, is_admin check)
│   │   ├── login/ signup/ profile/    # Auth pages
│   │   └── matches/ leaderboards/ players/  # Public pages
│   ├── components/
│   │   ├── ui/                        # Hand-built shadcn-style primitives
│   │   ├── shared/                    # Navbar, ScoreboardTicker, UserMenu
│   │   └── auth/                      # Signup/Login/Resend forms
│   ├── lib/
│   │   ├── supabase/                  # client.ts, server.ts, middleware.ts, env.ts
│   │   └── actions/                   # Server actions (auth.ts)
│   ├── middleware.ts                  # Session refresh + /admin route protection
│   └── types/database.ts              # TypeScript types mirroring the DB schema
└── README.md
```

---

## Step 1: Apply the Database Migration

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql`
3. Paste the entire contents and click **Run**

This creates the `profiles`, `matches`, and `ball_by_ball_logs` tables, all Row Level Security policies, the `is_admin()` helper function, the auth trigger that auto-creates a profile with a unique Player ID on signup, and 6 PostgreSQL views for leaderboards.

### Enable Realtime (required for live scoreboard)

In **Supabase Dashboard → SQL Editor**, run `supabase/migrations/002_enable_realtime.sql`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_by_ball_logs;
```

Or enable via **Database → Replication** in the dashboard. Without this step the public scoreboard will SSR correctly on load but won't receive live WebSocket updates — viewers will need to refresh manually.

### Allow the email confirmation redirect URL

In **Supabase Dashboard → Authentication → URL Configuration**, add your confirmation callback URL to the redirect allowlist, e.g.:
- Local dev: `http://localhost:3000/auth/confirm`
- Production: `https://your-app.vercel.app/auth/confirm`

---

## Step 2: Environment Variables

Create `.env.local` in the project root (copy from `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` is used to build the email confirmation redirect link — set it to your real deployed URL in production.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push this project to a Git repository and import it in Vercel, or deploy directly.
2. **Framework Preset must be "Next.js"** — if it's set to "Other" or any static-site preset, the build will fail with `No Output Directory named "public" found`, because Vercel will look for a static export instead of running `next build`.
3. **Set environment variables** in Vercel → Project Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (set this one to your production URL, e.g. `https://your-app.vercel.app`). **If these are missing, auth-dependent pages will throw a clear runtime error** rather than crashing the whole site — but nothing will actually work until they're set.
4. If you extracted this project into a nested folder before pushing, make sure Vercel's **Root Directory** setting points at the folder that directly contains `package.json`.
5. Redeploy after changing any of the above — Vercel does not apply env var or settings changes to already-running deployments.

---

## Granting Admin Access

After a user signs up and confirms their email, promote them to admin via the Supabase SQL Editor:

```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE player_id = 'their-player-id-here';
```

---

## Database Schema Overview

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | References `auth.users` |
| full_name | text | |
| player_id | text | Unique human-readable slug e.g. `virat-k-4821` |
| is_admin | boolean | Default `false` |

### `matches`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| team_a_name / team_b_name | text | |
| team_a_roster / team_b_roster | uuid[] | Array of `profiles.id` |
| status | enum | `scheduled` / `live` / `completed` |
| total_overs | integer | |
| current_innings | integer | 1 or 2 |
| live_data | jsonb | Real-time volatile state |

### `ball_by_ball_logs`
| Column | Type | Notes |
|--------|------|-------|
| match_id | uuid | |
| innings | integer | 1 or 2 |
| over_number | integer | 0-indexed |
| ball_number | integer | 1–6, legal deliveries only |
| is_legal_delivery | boolean | `false` for wides and no-balls |
| batsman_id / bowler_id | uuid | |
| runs_scored | integer | Runs off the bat |
| extra_runs | integer | |
| extra_type | enum | `wide` / `no_ball` / `bye` / `leg_bye` / `none` |
| is_wicket | boolean | |
| wicket_type | enum | `bowled`, `caught`, `lbw`, etc. |
| player_dismissed_id | uuid | |

---

## Leaderboard Views

| View | Description | Minimum |
|------|-------------|---------|
| `v_leaderboard_orange_cap` | Top 5 most runs | — |
| `v_leaderboard_purple_cap` | Top 5 most wickets | — |
| `v_leaderboard_strike_rate` | Top 5 best strike rate | 20 balls faced |
| `v_leaderboard_economy_rate` | Top 5 best economy | 4 overs bowled |

---

## Build Roadmap

- [x] Step 1 — Database schema, RLS, views, triggers
- [x] Step 2 — Next.js scaffold, design system, Supabase client setup
- [x] Step 3 — Auth (Signup / Login / Logout / Email confirmation / Profile)
- [x] Step 4 — Admin: create matches, assemble teams
- [x] Step 5 — Admin: ball-by-ball scoring console
- [x] Step 6 — Public: live scoreboard with Realtime
- [ ] Step 7 — Leaderboards dashboard

See `memory.md` for full implementation notes and discovered edge cases.
