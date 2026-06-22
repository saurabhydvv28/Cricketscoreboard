import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { ScoringConsole } from '@/components/scoring/scoring-console'
import { getDismissedBatsmen, getPreviousOverBowler } from '@/lib/actions/scoring'
import { battingRoster, bowlingRoster } from '@/lib/cricket/scoring'
import { createClient } from '@/lib/supabase/server'

export default async function ScoringConsolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/admin/matches/${id}/score`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/admin')
  }

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) {
    notFound()
  }

  if (match.status !== 'live') {
    redirect(`/admin/matches/${id}`)
  }

  const battingIds = battingRoster(match)
  const bowlingIds = bowlingRoster(match)
  const teamName = battingIds === match.team_a_roster ? match.team_a_name : match.team_b_name

  const { data: allPlayers } = await supabase
    .from('profiles')
    .select('id, full_name, player_id')
    .in('id', [...battingIds, ...bowlingIds])

  const playerMap = new Map((allPlayers ?? []).map((p) => [p.id, p]))
  const battingPlayers = battingIds
    .map((pid) => playerMap.get(pid))
    .filter((p): p is NonNullable<typeof p> => !!p)
  const bowlingPlayers = bowlingIds
    .map((pid) => playerMap.get(pid))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const dismissedIds = await getDismissedBatsmen(match.id, match.current_innings)
  const previousOverBowlerId = await getPreviousOverBowler(match.id, match.current_innings)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mx-auto max-w-xl">
          <Link
            href={`/admin/matches/${id}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Match details
          </Link>

          <ScoringConsole
            matchId={match.id}
            teamName={teamName}
            totalOvers={match.total_overs}
            liveData={match.live_data}
            battingPlayers={battingPlayers}
            bowlingPlayers={bowlingPlayers}
            dismissedIds={dismissedIds}
            previousOverBowlerId={previousOverBowlerId}
          />
        </div>
      </main>
    </div>
  )
}
