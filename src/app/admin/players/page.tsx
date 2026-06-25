import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { AddPlayerForm } from '@/components/admin/add-player-form'
import { DeletePlayerButton } from '@/components/admin/delete-player-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { verifyAdminSession } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default async function AdminPlayersPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect('/admin/login')

  const supabase = await createClient()
  const { data: players } = await supabase
    .from('profiles')
    .select('id, full_name, player_id, created_at')
    .order('full_name', { ascending: true })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>

          <h1 className="font-sans text-2xl font-bold text-foreground">Player Registry</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add players by name — no email or sign-up required. Their Player ID is auto-generated
            and can be used when assembling match rosters.
          </p>

          <div className="mt-6">
            <AddPlayerForm />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">
                All players ({players?.length ?? 0})
              </CardTitle>
              <CardDescription>
                Click the × to remove a player from the registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!players || players.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No players yet. Add one above.
                </p>
              ) : (
                <div className="divide-y divide-border/40">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 px-6 py-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-semibold">
                          {initials(player.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{player.full_name}</p>
                        <p className="font-mono text-xs text-amber">{player.player_id}</p>
                      </div>
                      <DeletePlayerButton playerId={player.id} playerName={player.full_name} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
