import { redirect } from 'next/navigation'
import { Copy } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/server'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/profile')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, player_id, is_admin, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login?redirectTo=/profile')
  }

  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-16">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile.full_name}</CardTitle>
                <CardDescription>
                  Player since {joined}
                  {profile.is_admin && (
                    <Badge variant="live" className="ml-2 align-middle">
                      Admin
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Your Player ID
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold text-amber">
                    {profile.player_id}
                  </span>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this ID with match admins so they can add you to
                  a team roster.
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Email: {user.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
