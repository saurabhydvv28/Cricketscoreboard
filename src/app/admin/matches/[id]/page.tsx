import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TossForm } from '@/components/admin/toss-form'
import { DeleteMatchButton } from '@/components/admin/delete-match-button'
import { createClient } from '@/lib/supabase/server'

export default async function MatchDetailPage({
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
    redirect(`/login?redirectTo=/admin/matches/${id}`)
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

  // Fetch roster player names — team_a_roster/team_b_roster are just uuid[]
  const allPlayerIds = [...match.team_a_roster, ...match.team_b_roster]
  const { data: players } = await supabase
    .from('profiles')
    .select('id, full_name, player_id')
    .in('id', allPlayerIds.length > 0 ? allPlayerIds : ['00000000-0000-0000-0000-000000000000'])

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]))

  const statusVariant =
    match.status === 'live' ? 'live' : match.status === 'completed' ? 'success' : 'secondary'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-sans text-2xl font-bold text-foreground">
                {match.team_a_name} vs {match.team_b_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {match.total_overs} overs per innings
              </p>
            </div>
            <Badge variant={statusVariant} className="capitalize">
              {match.status}
            </Badge>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {([
              { name: match.team_a_name, roster: match.team_a_roster },
              { name: match.team_b_name, roster: match.team_b_roster },
            ] as const).map((team) => (
              <Card key={team.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-amber" />
                    {team.name}
                  </CardTitle>
                  <CardDescription>
                    {team.roster.length} player{team.roster.length === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {team.roster.map((playerId) => {
                      const p = playerMap.get(playerId)
                      return (
                        <li
                          key={playerId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-foreground">
                            {p?.full_name ?? 'Unknown player'}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p?.player_id ?? '—'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            {match.status === 'scheduled' && (
              <TossForm
                matchId={match.id}
                teamAName={match.team_a_name}
                teamBName={match.team_b_name}
              />
            )}

            {match.status === 'live' && (
              <Card>
                <CardHeader>
                  <CardTitle>Match in progress</CardTitle>
                  <CardDescription>
                    Continue ball-by-ball scoring from the live console.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={`/admin/matches/${match.id}/score`}>
                      Open scoring console
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {match.status === 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Match completed</CardTitle>
                  <CardDescription>
                    This match has finished. View it on the public
                    scoreboard for the final result.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={`/matches/${match.id}`}>
                      View final scoreboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {match.status === 'scheduled' && (
            <div className="mt-6 flex justify-end">
              <DeleteMatchButton matchId={match.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
