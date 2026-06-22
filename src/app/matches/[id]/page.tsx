import { notFound } from 'next/navigation'

import { Navbar } from '@/components/shared/navbar'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('id, team_a_name, team_b_name, status, total_overs')
    .eq('id', id)
    .single()

  if (!match) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {match.team_a_name} vs {match.team_b_name}
                </CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {match.status}
                </Badge>
              </div>
              <CardDescription>
                {match.total_overs} overs per innings. The live
                real-time scoreboard is coming in Step 6.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
