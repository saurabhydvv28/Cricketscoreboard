import Link from 'next/link'
import { Plus, Radio, Calendar, CheckCircle2, Users } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { verifyAdminSession } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Match } from '@/types/database'

function MatchRow({ match }: { match: Pick<Match, 'id' | 'team_a_name' | 'team_b_name' | 'status' | 'total_overs'> }) {
  const href = match.status === 'live' ? `/admin/matches/${match.id}/score` : `/admin/matches/${match.id}`
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
    >
      <div>
        <p className="text-sm font-medium text-foreground">
          {match.team_a_name} vs {match.team_b_name}
        </p>
        <p className="text-xs text-muted-foreground">{match.total_overs} overs</p>
      </div>
      {match.status === 'live' && <Badge variant="live">Live</Badge>}
      {match.status === 'completed' && <Badge variant="success">Done</Badge>}
    </Link>
  )
}

export default async function AdminPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect('/admin/login')

  const supabase = await createClient()
  const [{ data: matches }, { count: playerCount }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, team_a_name, team_b_name, status, total_overs, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const live = (matches ?? []).filter((m) => m.status === 'live')
  const scheduled = (matches ?? []).filter((m) => m.status === 'scheduled')
  const completed = (matches ?? []).filter((m) => m.status === 'completed')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{playerCount ?? 0} registered players</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/players">
                <Users className="h-4 w-4" /> Players
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/matches/new">
                <Plus className="h-4 w-4" /> New match
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {live.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radio className="h-4 w-4 text-boundary" /> Live now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {live.map((m) => <MatchRow key={m.id} match={m} />)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-amber" /> Scheduled
              </CardTitle>
              <CardDescription>Matches waiting for the toss.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {scheduled.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scheduled matches.{' '}
                  <Link href="/admin/matches/new" className="text-amber hover:underline">Create one</Link>.
                </p>
              ) : scheduled.map((m) => <MatchRow key={m.id} match={m} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-pitch-green" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed matches yet.</p>
              ) : completed.map((m) => <MatchRow key={m.id} match={m} />)}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
