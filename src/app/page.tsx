import Link from "next/link"
import { Radio, Trophy, ArrowRight } from "lucide-react"

import { Navbar } from "@/components/shared/navbar"
import { ScoreboardTicker } from "@/components/shared/scoreboard-ticker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name : `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

function batsmanStats(playerId: string, balls: { batsman_id: string; runs_scored: number; extra_type: string; is_legal_delivery: boolean }[]) {
  let runs = 0, ballsFaced = 0
  for (const b of balls) {
    if (b.batsman_id !== playerId) continue
    if (b.extra_type !== 'bye' && b.extra_type !== 'leg_bye') runs += b.runs_scored
    if (b.is_legal_delivery) ballsFaced++
  }
  return { runs, balls: ballsFaced }
}

export default async function Home() {
  const supabase = await createClient()

  // Fetch all live matches, plus scheduled/completed for the fixture list
  const { data: matches } = await supabase
    .from('matches')
    .select('id, team_a_name, team_b_name, status, total_overs, live_data, current_innings, toss_winner, toss_decision, innings1_score, team_a_roster, team_b_roster')
    .order('created_at', { ascending: false })
    .limit(10)

  const live = (matches ?? []).filter((m) => m.status === 'live')
  const recent = (matches ?? []).filter((m) => m.status === 'completed').slice(0, 3)
  const upcoming = (matches ?? []).filter((m) => m.status === 'scheduled').slice(0, 3)

  const primaryLive = live[0] ?? null

  // Fetch recent balls for the primary live match for batsman stats
  let primaryBalls: Array<{ batsman_id: string; runs_scored: number; extra_type: string; is_legal_delivery: boolean }> = []
  let playerMap = new Map<string, { full_name: string }>()

  if (primaryLive) {
    const [{ data: balls }, { data: players }] = await Promise.all([
      supabase
        .from('ball_by_ball_logs')
        .select('batsman_id, runs_scored, extra_type, is_legal_delivery')
        .eq('match_id', primaryLive.id)
        .eq('innings', primaryLive.current_innings)
        .order('id', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [...primaryLive.team_a_roster ?? [], ...primaryLive.team_b_roster ?? []])
    ])
    primaryBalls = balls ?? []
    playerMap = new Map((players ?? []).map((p) => [p.id, p]))
  }

  const liveData = primaryLive?.live_data
  const teamABatsInnings1 = primaryLive
    ? (primaryLive.toss_winner === 'team_a' && primaryLive.toss_decision === 'bat') ||
      (primaryLive.toss_winner === 'team_b' && primaryLive.toss_decision === 'bowl')
    : false

  const battingTeam = primaryLive
    ? (primaryLive.current_innings === 1
        ? (teamABatsInnings1 ? primaryLive.team_a_name : primaryLive.team_b_name)
        : (teamABatsInnings1 ? primaryLive.team_b_name : primaryLive.team_a_name))
    : null

  const strikerStats = liveData?.striker_id ? batsmanStats(liveData.striker_id, primaryBalls) : null
  const nonStrikerStats = liveData?.non_striker_id ? batsmanStats(liveData.non_striker_id, primaryBalls) : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container py-8 sm:py-12">

          {/* ── PRIMARY: LIVE MATCH ── */}
          {primaryLive && liveData ? (
            <section className="mb-10">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="live" className="gap-1.5">
                  <span className="live-pulse h-1.5 w-1.5 rounded-full bg-current" />
                  Live
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {primaryLive.team_a_name} vs {primaryLive.team_b_name}
                </span>
              </div>

              <ScoreboardTicker
                teamName={battingTeam!}
                score={liveData.score}
                wickets={liveData.wickets}
                overs={liveData.overs}
                totalOvers={primaryLive.total_overs}
                runRate={liveData.run_rate}
                isLive
                currentOverBalls={liveData.current_over_balls.map((b) => ({
                  label: b.label,
                  isWicket: b.is_wicket,
                  isBoundary: b.runs === 4 || b.runs === 6,
                }))}
              />

              {/* Batsman stats — the key feature: "56 runs (20 balls)" */}
              {(liveData.striker_id || liveData.non_striker_id) && (
                <div className="mt-3 rounded-md border border-border bg-surface-raised px-4 py-3">
                  <div className="space-y-2">
                    {liveData.striker_id && strikerStats && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-amber">
                          {shortName(playerMap.get(liveData.striker_id)?.full_name ?? '—')} *
                        </span>
                        <span className="scoreboard-numerals font-mono">
                          <span className="text-lg font-bold text-amber">{strikerStats.runs}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({strikerStats.balls} balls)</span>
                        </span>
                      </div>
                    )}
                    {liveData.non_striker_id && nonStrikerStats && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {shortName(playerMap.get(liveData.non_striker_id)?.full_name ?? '—')}
                        </span>
                        <span className="scoreboard-numerals font-mono">
                          <span className="text-base font-bold text-foreground">{nonStrikerStats.runs}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({nonStrikerStats.balls} balls)</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Innings 2 chase info */}
              {primaryLive.current_innings === 2 && liveData.target !== null && (
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Target{' '}
                  <span className="font-mono font-bold text-amber">{liveData.target}</span>
                  {' '}· Need{' '}
                  <span className="font-mono font-bold text-amber">
                    {Math.max(0, liveData.target - liveData.score)}
                  </span>{' '}
                  runs
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button asChild size="sm">
                  <Link href={`/matches/${primaryLive.id}`}>
                    Full scoreboard <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Other live matches */}
              {live.length > 1 && (
                <div className="mt-3 space-y-2">
                  {live.slice(1).map((m) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center justify-between rounded-md border border-boundary/30 bg-boundary/5 px-3 py-2.5 text-sm hover:bg-boundary/10"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="h-3 w-3 text-boundary" />
                        <span className="font-medium">{m.team_a_name} vs {m.team_b_name}</span>
                      </div>
                      <span className="scoreboard-numerals font-mono text-sm">
                        {m.live_data.score}/{m.live_data.wickets} ({m.live_data.overs})
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* No live match — clean "no game on" state */
            <section className="mb-10 rounded-lg border border-border bg-surface px-6 py-10 text-center">
              <p className="text-lg font-semibold text-foreground">No match live right now</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back when a game is in progress, or view all fixtures below.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/matches">View all matches</Link>
              </Button>
            </section>
          )}

          {/* ── UPCOMING ── */}
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Upcoming
              </h2>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-raised"
                  >
                    <span className="font-medium text-foreground">{m.team_a_name} vs {m.team_b_name}</span>
                    <span className="text-xs text-muted-foreground">{m.total_overs} overs</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── RECENT RESULTS ── */}
          {recent.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent results
              </h2>
              <div className="space-y-2">
                {recent.map((m) => {
                  const tAB1 =
                    (m.toss_winner === 'team_a' && m.toss_decision === 'bat') ||
                    (m.toss_winner === 'team_b' && m.toss_decision === 'bowl')
                  const t1Name = tAB1 ? m.team_a_name : m.team_b_name
                  const t2Name = tAB1 ? m.team_b_name : m.team_a_name
                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-raised"
                    >
                      <span className="font-medium text-foreground">{m.team_a_name} vs {m.team_b_name}</span>
                      <span className="scoreboard-numerals text-xs text-muted-foreground font-mono">
                        {t1Name} {m.innings1_score} · {t2Name} {m.live_data?.score ?? '—'}/{m.live_data?.wickets ?? '—'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── QUICK LINKS ── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/leaderboards"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-4 hover:bg-surface-raised"
            >
              <Trophy className="h-5 w-5 text-amber" />
              <div>
                <p className="font-semibold text-foreground">Leaderboards</p>
                <p className="text-xs text-muted-foreground">Orange Cap, Purple Cap, SR, Economy</p>
              </div>
            </Link>
            <Link
              href="/players"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-4 hover:bg-surface-raised"
            >
              <Radio className="h-5 w-5 text-amber" />
              <div>
                <p className="font-semibold text-foreground">All matches</p>
                <p className="text-xs text-muted-foreground">Live, upcoming, and results</p>
              </div>
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
