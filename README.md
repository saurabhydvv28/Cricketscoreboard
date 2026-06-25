# 🏏 Cricket Scoreboard

A real-time local cricket scoring app — built for gully cricket, backyard leagues, and local tournaments. No email accounts needed. Admin logs in with a PIN.

---

## What It Does

| Feature | Details |
|---------|---------|
| **Live scoreboard** | Real-time updates via Supabase Realtime — no refresh needed |
| **Batsman stats** | Striker shown as `56 runs (20 balls)` on the live view |
| **Ball commentary** | Per-delivery narrative: "SIX! R. Sharma off V. Patel!" |
| **Innings scorecard** | Full batting & bowling tables on the match page |
| **Leaderboards** | Orange Cap, Purple Cap, Strike Rate, Economy Rate — all from DB views |
| **Admin PIN login** | One PIN for the scorer — no email, no Supabase Auth |
| **Player registry** | Admin adds players by name only. Auto-generates Player IDs. |
| **No player accounts** | Players don't sign up. Admin manages everything. |

---

## Routes

| Path | Who | What |
|------|-----|------|
| `/` | Public | Live match score + fixtures |
| `/matches` | Public | All matches (live/upcoming/results) |
| `/matches/[id]` | Public | Full live scoreboard with Realtime |
| `/leaderboards` | Public | Orange Cap, Purple Cap, SR, Economy |
| `/players` | Public | Player directory |
| `/admin` | Admin | Dashboard (match list) |
| `/admin/login` | Admin | PIN login |
| `/admin/players` | Admin | Add/remove players |
| `/admin/matches/new` | Admin | Create match + assemble rosters |
| `/admin/matches/[id]` | Admin | Match detail + toss + start |
| `/admin/matches/[id]/score` | Admin | Live ball-by-ball scoring console |

---

## Setup (5 steps)

### 1. Apply database migrations

In **Supabase → SQL Editor**, run each file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_enable_realtime.sql
supabase/migrations/003_no_auth_profiles.sql
```

### 2. Set environment variables

Create `.env.local` (copy from `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PIN=1234
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find the keys in **Supabase → Project Settings → API**.

### 3. For Vercel deployment

In **Vercel → Project Settings → Environment Variables**, add all 5 variables above (set `NEXT_PUBLIC_SITE_URL` to your live URL).

**Framework Preset must be "Next.js"** — not "Other".

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Add your first player

Go to `/admin/login`, enter your `ADMIN_PIN`, then navigate to **Players** to add the squad.

---

## Admin workflow for a match

1. `/admin/players` → Add all players by name
2. `/admin/matches/new` → Create match, assign rosters
3. `/admin/matches/[id]` → Record the toss → Start match
4. `/admin/matches/[id]/score` → Score ball by ball

---

## Key design decisions

- **No Supabase Auth** — uses a simple JWT cookie signed with the `ADMIN_PIN` for admin sessions. Players have no accounts.
- **Service role client for writes** — all INSERT/UPDATE/DELETE bypass RLS, using the service role key server-side only.
- **`live_data` JSONB** — every ball updates this field on the match row. The public scoreboard subscribes to `UPDATE` events on this row, so every delivery pushes a full refresh of the scoreboard state in ~100ms.
- **Batsman stats computed from ball log** — the at-the-crease widget shows `runs (balls)` by scanning `ball_by_ball_logs` for the current innings. This is always accurate even after an undo.

---

## Environment Variables Reference

| Variable | Required | Where to find |
|----------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API |
| `ADMIN_PIN` | ✅ | Set to any PIN you want |
| `NEXT_PUBLIC_SITE_URL` | Optional | Your deployed URL (for metadata) |
