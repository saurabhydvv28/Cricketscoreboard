import Link from "next/link"
import { Radio } from "lucide-react"

import { Navbar } from "@/components/shared/navbar"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from("matches")
    .select("id, team_a_name, team_b_name, status, total_overs")
    .order("created_at", { ascending: false })

  const live = (matches ?? []).filter((m) => m.status === "live")
  const others = (matches ?? []).filter((m) => m.status !== "live")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-16">
        <h1 className="font-sans text-2xl font-bold text-foreground">
          Matches
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full real-time live scoreboard is coming in Step 6 — this
          is a basic match list for now.
        </p>

        {!matches || matches.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No matches yet. Check back once an admin schedules one.
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {[...live, ...others].map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card className="transition-colors hover:bg-surface-raised">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">
                        {match.team_a_name} vs {match.team_b_name}
                      </CardTitle>
                      <CardDescription>
                        {match.total_overs} overs per innings
                      </CardDescription>
                    </div>
                    {match.status === "live" ? (
                      <Badge variant="live" className="live-pulse">
                        <Radio className="mr-1 h-3 w-3" />
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {match.status}
                      </Badge>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
