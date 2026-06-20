# Project Memory: Local Cricket Scoreboard

## Project Overview
A full-stack Local Cricket Match Scoreboard web application built with Next.js 14 (App Router), Tailwind CSS, hand-built shadcn-style components, and Supabase (PostgreSQL + Auth + Realtime + RLS). The app supports two user roles: public viewers/players who can register and view live scores/leaderboards, and admins who can create matches and score ball-by-ball in real-time. Project scaffolding, design system, and full auth flows (signup/login/logout/email confirmation) are complete with real Supabase Auth wiring; match creation and live scoring logic are not yet implemented.

## System Configuration & Tech Stack
- **Frontend:** Next.js 14.2.35 (App Router), TypeScript, Tailwind CSS v3, hand-built shadcn-style components (Radix UI primitives + cva), Lucide React icons
- **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime, RLS) via `@supabase/ssr@0.12.0` + `@supabase/supabase-js@2.108.0` (cookie-based SSR auth) — versions pinned exact, see edge case note below
- **Fonts:** Geist Sans (display/UI) + Geist Mono (scoreboard ticker digits) — bundled locally as variable fonts, no external font CDN needed
- **Design theme:** "Stadium Ledger" — deep pitch-green/navy dark theme, stump-LED amber accent, boundary-red for wickets/sixes, tabular-mono scoreboard numerals. See `src/app/globals.css` for tokens.
- **Package Manager:** npm

## Completed Features
- [x] `memory.md` initialized
- [x] Step 1: Database migration SQL script (`supabase/migrations/001_initial_schema.sql`)
  - `profiles`, `matches`, `ball_by_ball_logs` tables, RLS policies, `is_admin()` helper, auth trigger, 6 leaderboard views
- [x] Step 2: Next.js project scaffolding complete
  - Next.js 14 + TypeScript + Tailwind v3 + App Router + src/ dir, Supabase clients (browser/server/middleware), full DB types, hand-built shadcn-style UI primitives (Button, Card, Input, Label, Badge, Select, Tabs, Avatar), signature `ScoreboardTicker` component, `Navbar`, homepage, placeholder routes
- [x] Step 3: Auth flows complete (real Supabase Auth, not stubs)
  - `src/lib/actions/auth.ts` — server actions: `signup`, `login`, `logout`, `resendConfirmation`. Signup validates fullName/email/password, calls `supabase.auth.signUp()` with `emailRedirectTo`, relies on the DB trigger from Step 1 to auto-create the `profiles` row with generated `player_id`. Login uses `signInWithPassword`, supports `redirectTo` for post-login navigation back to the originally-requested page.
  - `src/app/auth/confirm/route.ts` — GET route handler verifying the `token_hash`/`type` OTP from the email confirmation link via `supabase.auth.verifyOtp()`, redirects to `/auth/error` on failure
  - `src/app/auth/error/page.tsx` — friendly error page for expired/invalid confirmation links
  - `src/app/signup/page.tsx` + `src/components/auth/signup-form.tsx` — real signup form using `useFormState`/`useFormStatus` (React 18 / Next 14 pattern — NOT `useActionState`, that's React 19+)
  - `src/app/signup/check-email/page.tsx` + `src/components/auth/resend-confirmation-form.tsx` — post-signup "check your inbox" screen with working resend-confirmation form
  - `src/app/login/page.tsx` + `src/components/auth/login-form.tsx` — real login form, redirects already-authenticated users away, respects `?redirectTo=` query param set by middleware
  - `src/components/shared/navbar.tsx` converted to an **async server component** — fetches `auth.getUser()` + profile row, renders `UserMenu` (signed in) or "Sign in" link (signed out)
  - `src/components/shared/user-menu.tsx` — client dropdown (Radix `DropdownMenu`) showing name/player_id/admin badge, links to Profile and (if admin) Admin dashboard, logout button wired to a `<form action={logout}>` 
  - `src/app/profile/page.tsx` — real profile page showing full name, Player ID, admin badge, join date, email; redirects to `/login?redirectTo=/profile` if unauthenticated
  - `src/app/admin/page.tsx` — now does a **real server-side `is_admin` check** (queries `profiles.is_admin`), not just a session check. Closes the gap flagged in the Step 2 memory notes. Shows an "Admins only" message for authenticated non-admins, redirects unauthenticated users to login.
  - `.env.local.example` updated with `NEXT_PUBLIC_SITE_URL` (needed for `emailRedirectTo`)
  - Production build verified clean — 12 routes, 0 type errors, 0 lint errors

## Current Work in Progress
- [ ] Step 4 next: Admin panel — create matches, search/select players by Player ID, initiate match

## Remaining Backlog
- [ ] Step 4: Admin panel — create matches, search and select players by Player ID, initiate match
- [ ] Step 5: Admin dynamic scoring console — ball-by-ball logging, striker/non-striker/bowler selectors, extras, wickets, over transitions
- [ ] Step 6: Public scoreboard page with Supabase Realtime subscription
- [ ] Step 7: Leaderboard dashboard — Top 5 for Orange Cap, Purple Cap, Strike Rate, Economy Rate

## Discovered Edge Cases & Technical Nuances
- PostgreSQL views for Leaderboards require explicit `CAST` to avoid BigInt hydration errors in Next.js SSR — all aggregated integer fields cast as `INTEGER` or `NUMERIC` in the views.
- `live_data` JSONB field on `matches` stores volatile state (striker_id, non_striker_id, bowler_id, current_score, wickets, overs_bowled, current_over_balls) for O(1) scoreboard rendering without expensive joins on every ball.
- Wide and No Ball deliveries do NOT count as legal balls (ball_number is not incremented for the over in those cases); the `ball_by_ball_logs` table records a `is_legal_delivery` boolean to handle this.
- Strike rotation: strike changes on odd legal runs scored by batsman; strike always changes at end of over.
- `player_id` on profiles is a human-readable slug (e.g., `virat-k-42`) generated at signup for easy team assembly by admins.
- RLS on `ball_by_ball_logs` and `matches` for write operations checks `profiles.is_admin = true` via a security-definer function to avoid RLS recursion.
- **shadcn CLI registry (`ui.shadcn.com`) is unreachable on this sandbox's network allowlist** — all shadcn-style components must be hand-built from `@radix-ui/react-*` primitives + `class-variance-authority` instead of `npx shadcn add <component>`. The `@radix-ui/react-badge` package does not exist on npm at all — Badge was built as a plain styled div with cva variants, no Radix primitive needed.
- `next/font/google` will fail at build time on this sandbox (Google Fonts CDN not in network allowlist) — use `next/font/local` with the Geist woff files already bundled by `create-next-app`, or self-host any other fonts under `src/app/fonts/`.
- `@supabase/supabase-js` triggers an Edge Runtime warning during build ("A Node.js API is used... process.version") when imported transitively into `middleware.ts` via `@supabase/ssr`. This is benign — middleware only exercises the auth/cookie subset of the client — but worth knowing it's expected noise in build output, not a real error.
- Tailwind v3 (not v4) was scaffolded by `create-next-app` in this environment — config lives in `tailwind.config.ts` with a traditional `content` array, not the v4 CSS-first `@theme` approach.
- Design tokens use HSL channel triples in CSS vars (e.g. `--background: 152 28% 6%`) consumed via `hsl(var(--x))` in Tailwind config, the standard shadcn convention — keeps dark theme + future light theme variants easy to add later.
- **CRITICAL TypeScript gotcha — `interface` vs `type` in Database row definitions completely breaks Supabase query type inference.** Discovered while building Step 3: every `.from(table).select(...)` result was silently typed as `never` (e.g. `Property 'is_admin' does not exist on type 'never'`), with no error pointing at the real cause. Root cause: `@supabase/supabase-js@2.108.x`'s `GenericTable` constraint requires `Row`/`Insert`/`Update` to structurally satisfy `Record<string, unknown>`. TypeScript `interface` declarations do NOT satisfy open index-signature constraints like this even when all declared properties match — only `type` object-literal aliases do, because interfaces support declaration merging and TS won't implicitly grant them an index signature. **Fix: every row/table shape in `src/types/database.ts` (`Profile`, `Match`, `BallByBallLog`, all leaderboard view rows) must be declared with `type X = { ... }`, never `interface X { ... }`.** `OrangeCapRow`/`PurpleCapRow` use `BattingStatsRow & { rank: number }` intersection instead of `interface X extends Y` for the same reason. If adding new tables/views to the schema in future steps, keep this pattern.
- Also required for correct inference: the `Database` type needs a `__InternalSupabase: { PostgrestVersion: '12' }` marker (matches current official `supabase gen types typescript` output format), and every `Tables`/`Views` entry needs an explicit `Relationships: []` field — both are part of the `GenericTable`/`GenericSchema` constraint in supabase-js 2.108.x and are silently required even though older supabase-js versions didn't need them.
- `@supabase/ssr` and `@supabase/supabase-js`/`@supabase/postgrest-js` versions must stay in sync (lockfile can drift these out of step during `npm install`, which can also surface as `never` types) — currently pinned: `@supabase/ssr@0.12.0`, `@supabase/supabase-js@2.108.0`.
- React 18 / Next.js 14.2 form state pattern: use `useFormState` + `useFormStatus` from `react-dom`. Do NOT use `useActionState` (that's the React 19 rename) — it doesn't exist in this project's React version and would fail to import.
- Server actions that call `redirect()` (e.g. `signup`, `login`, `logout`) must NOT be wrapped in try/catch that swallows the redirect — `redirect()` works by throwing a special Next.js internal error that must propagate. The auth actions in `src/lib/actions/auth.ts` return early instead of redirecting on validation/auth errors, and only call `redirect()` on the success path, after `revalidatePath`.
- Admin route protection is now two-layered: `src/middleware.ts` redirects unauthenticated `/admin/*` requests to `/login` (cheap, no DB query), and `src/app/admin/page.tsx` does the real `profiles.is_admin` check server-side and renders an "Admins only" message for authenticated non-admins (can't be done cheaply in middleware without a DB round-trip on every request).


