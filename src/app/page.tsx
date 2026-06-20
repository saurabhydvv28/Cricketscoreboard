import Link from "next/link"
import { Trophy, Radio, Users } from "lucide-react"

import { Navbar } from "@/components/shared/navbar"
import { ScoreboardTicker } from "@/components/shared/scoreboard-ticker"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="container py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
                Ball by ball, live
              </span>
              <h1 className="mt-4 font-sans text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                Every run, wicket, and over —
                <span className="text-amber"> scored as it happens.</span>
              </h1>
              <p className="mt-5 max-w-md text-base text-muted-foreground">
                Follow local matches with a real-time scoreboard, track
                Orange Cap and Purple Cap races, and see exactly how the
                game is unfolding — over by over.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/matches">
                    <Radio className="h-4 w-4" />
                    View live matches
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/signup">Create player profile</Link>
                </Button>
              </div>
            </div>

            {/* Signature element: live scoreboard ticker preview */}
            <div className="space-y-3">
              <ScoreboardTicker
                teamName="Riverside Strikers"
                score={142}
                wickets={4}
                overs="16.3"
                totalOvers={20}
                runRate={8.6}
                isLive
                currentOverBalls={[
                  { label: "1" },
                  { label: "4", isBoundary: true },
                  { label: "W", isWicket: true },
                  { label: "0" },
                  { label: "6", isBoundary: true },
                ]}
              />
              <p className="text-center font-mono text-xs text-muted-foreground">
                Live example — real matches update instantly
              </p>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="container pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Radio className="h-5 w-5 text-amber" />
                <CardTitle className="mt-2">Live Scoreboard</CardTitle>
                <CardDescription>
                  Real-time updates as the admin logs each delivery —
                  no refresh needed.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Trophy className="h-5 w-5 text-amber" />
                <CardTitle className="mt-2">Leaderboards</CardTitle>
                <CardDescription>
                  Orange Cap, Purple Cap, top strike rate, and best
                  economy — updated after every match.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-5 w-5 text-amber" />
                <CardTitle className="mt-2">Player Profiles</CardTitle>
                <CardDescription>
                  Register once, get a unique Player ID, and get picked
                  for teams by admins in seconds.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container text-center text-xs text-muted-foreground">
          Local Cricket Scoreboard — built for local leagues and weekend matches.
        </div>
      </footer>
    </div>
  )
}
