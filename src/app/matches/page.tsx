import Link from "next/link"
import { Radio, Calendar, CheckCircle2 } from "lucide-react"

import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"

function MatchCard({ match }: { match: Pick<Match, 'id' | 'team_a_name' | 'team_b_name' | 'status' | 'total_overs' | 'live_data' | 'current_innings' | 'innings1_score' | 'toss_winner' | 'toss_decision'> }) {
  const isLive = match.status === 'live'
  const live = match.live_data

  const teamABatsInnings1 =
    (match.toss_winner === 'team_a' && match.toss_decision === 'bat') ||
    (match.toss_winner === 'team_b' && match.toss_decision === 'bowl')

  const battingTeamName =
    match.current_innings === 1
      ? teamABatsInnings1 ? match.team_a_name : match.team_b_name
      : teamABatsInnings1 ? match.team_b_name : match.team_a_name

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-lg border border-border bg-surface transition-colors hover:bg-surface-raised"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {match.team_a_name} vs {match.team_b_name}
            </p>
            <p className="text-xs text-muted-foreground">{match.total_overs} overs</p>
          </div>
          {isLive ? (
            <Badge variant="live" className="shrink-0">
              <Radio className="mr-1 h-2.5 w-2.5" />
              Live
            </Badge>
          ) : match.status === 'completed' ? (
            <Badge variant="success" className="shrink-0">Done</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 capitalize">{match.status}</Badge>
          )}
        </div>

        {isLive && live.score !== undefined && (
          <div className="mt-3 flex items-end justify-between border-t border-border/40 pt-3">
            <div>
              <p className="text-xs text-muted-foreground">{battingTeamName}</p>
              <p className="scoreboard-numerals font-mono text-2xl font-bold text-amber">
                {live.score}/{live.wickets}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  ({live.overs})
                </span>
              </p>
            </div>
            {live.target !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="scoreboard-numerals font-mono text-lg font-bold text-foreground">
                  {live.target}
                </p>
              </div>
            )}
            {live.run_rate > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                RR <span className="font-mono">{live.run_rate.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}

        {match.status === 'completed' && match.innings1_score !== null && (
          <div className="mt-3 flex gap-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <span>
              {teamABatsInnings1 ? match.team_a_name : match.team_b_name}:{' '}
              <span className="font-mono font-medium text-foreground">{match.innings1_score}</span>
            </span>
            <span>
              {teamABatsInnings1 ? match.team_b_name : match.team_a_name}:{' '}
              <span className="font-mono font-medium text-foreground">{live.score}/{live.wickets}</span>
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('id, team_a_name, team_b_name, status, total_overs, live_data, current_innings, innings1_score, toss_winner, toss_decision')
    .order('created_at', { ascending: false })

  const live = (matches ?? []).filter((m) => m.status === 'live')
  const scheduled = (matches ?? []).filter((m) => m.status === 'scheduled')
  const completed = (matches ?? []).filter((m) => m.status === 'completed')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <h1 className="font-sans text-2xl font-bold text-foreground">Matches</h1>

        {!matches || matches.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No matches yet. Check back once an admin schedules one.
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {live.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-boundary">
                  <Radio className="h-3.5 w-3.5" /> Live now
                </h2>
                <div className="space-y-2">
                  {live.map((m) => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {scheduled.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Upcoming
                </h2>
                <div className="space-y-2">
                  {scheduled.map((m) => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Results
                </h2>
                <div className="space-y-2">
                  {completed.map((m) => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
