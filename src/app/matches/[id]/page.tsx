import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import type { Metadata } from 'next'

import { Navbar } from '@/components/shared/navbar'
import { LiveScoreboard } from '@/components/scoreboard/live-scoreboard'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select('team_a_name, team_b_name, status')
    .eq('id', id)
    .single()

  if (!match) return { title: 'Match not found' }
  return {
    title: `${match.team_a_name} vs ${match.team_b_name} — Cricket Scoreboard`,
    description: `Live scores: ${match.team_a_name} vs ${match.team_b_name}. Status: ${match.status}.`,
  }
}

export default async function PublicMatchPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the full match row — live_data JSONB carries current score
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  // Fetch recent balls for the current innings (for real-time commentary)
  // and separately the full innings 1 log (for the batting/bowling scorecard)
  const [{ data: currentInningsBalls }, { data: innings1BallsRaw }] = await Promise.all([
    supabase
      .from('ball_by_ball_logs')
      .select('*')
      .eq('match_id', id)
      .eq('innings', match.current_innings)
      .order('id', { ascending: false })
      .limit(12),
    match.current_innings === 2
      ? supabase
          .from('ball_by_ball_logs')
          .select('*')
          .eq('match_id', id)
          .eq('innings', 1)
          .order('id', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  // Resolve all player IDs from both rosters to names in one query
  const allPlayerIds = [...match.team_a_roster, ...match.team_b_roster]
  const { data: players } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', allPlayerIds.length > 0 ? allPlayerIds : ['00000000-0000-0000-0000-000000000000'])

  const statusVariant =
    match.status === 'live' ? 'live' : match.status === 'completed' ? 'success' : 'secondary'

  const tossText =
    match.toss_winner && match.toss_decision
      ? `${match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name} won the toss and elected to ${match.toss_decision}`
      : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/matches"
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All matches
          </Link>

          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-sans text-xl font-bold text-foreground sm:text-2xl">
                {match.team_a_name} vs {match.team_b_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {match.total_overs} overs per innings
              </p>
              {tossText && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {tossText}
                </p>
              )}
            </div>
            <Badge variant={statusVariant} className="capitalize shrink-0">
              {match.status === 'live' && <span className="live-pulse mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />}
              {match.status}
            </Badge>
          </div>

          {match.status === 'scheduled' ? (
            <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center">
              <p className="font-medium text-foreground">Match not started yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back once the toss has been done and play begins.
              </p>
            </div>
          ) : (
            <LiveScoreboard
              initialMatch={match}
              initialBalls={currentInningsBalls ?? []}
              allPlayers={players ?? []}
              innings1Balls={innings1BallsRaw ?? []}
            />
          )}
        </div>
      </main>
    </div>
  )
}

