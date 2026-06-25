import { Navbar } from '@/components/shared/navbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OrangeCapTable } from '@/components/leaderboards/orange-cap-table'
import { PurpleCapTable } from '@/components/leaderboards/purple-cap-table'
import { StrikeRateTable, EconomyRateTable } from '@/components/leaderboards/sr-eco-tables'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboards — Cricket Scoreboard',
  description: 'Orange Cap, Purple Cap, highest strike rate, and best economy rate across all matches.',
}

export default async function LeaderboardsPage() {
  const supabase = await createClient()

  // Fetch all four leaderboard views in parallel — each is a
  // pre-computed PostgreSQL view from migration 001 with explicit
  // CAST to INTEGER/NUMERIC, so no BigInt hydration issues in Next.js.
  const [
    { data: orangeCap },
    { data: purpleCap },
    { data: strikeRate },
    { data: economyRate },
  ] = await Promise.all([
    supabase.from('v_leaderboard_orange_cap').select('*'),
    supabase.from('v_leaderboard_purple_cap').select('*'),
    supabase.from('v_leaderboard_strike_rate').select('*'),
    supabase.from('v_leaderboard_economy_rate').select('*'),
  ])

  const hasAnyData =
    (orangeCap?.length ?? 0) > 0 ||
    (purpleCap?.length ?? 0) > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-bold text-foreground">
            Leaderboards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Top 5 performers across all completed and live matches.
            {!hasAnyData && ' Stats will appear here once matches have been played.'}
          </p>
        </div>

        <Tabs defaultValue="orange-cap" className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap gap-1 bg-surface p-1 sm:inline-flex sm:flex-nowrap">
            <TabsTrigger value="orange-cap" className="gap-1.5">
              <span aria-hidden>🟠</span> Orange Cap
            </TabsTrigger>
            <TabsTrigger value="purple-cap" className="gap-1.5">
              <span aria-hidden>🟣</span> Purple Cap
            </TabsTrigger>
            <TabsTrigger value="strike-rate" className="gap-1.5">
              <span aria-hidden>⚡</span> Strike Rate
            </TabsTrigger>
            <TabsTrigger value="economy" className="gap-1.5">
              <span aria-hidden>🎯</span> Economy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orange-cap">
            <OrangeCapTable rows={orangeCap ?? []} />
          </TabsContent>

          <TabsContent value="purple-cap">
            <PurpleCapTable rows={purpleCap ?? []} />
          </TabsContent>

          <TabsContent value="strike-rate">
            <StrikeRateTable rows={strikeRate ?? []} />
          </TabsContent>

          <TabsContent value="economy">
            <EconomyRateTable rows={economyRate ?? []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

