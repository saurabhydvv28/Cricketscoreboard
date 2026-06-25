import { Navbar } from "@/components/shared/navbar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Players — Cricket Scoreboard",
  description: "All registered players and their unique Player IDs.",
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export default async function PlayersPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from("profiles")
    .select("id, full_name, player_id, created_at")
    .order("full_name", { ascending: true })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <h1 className="font-sans text-2xl font-bold text-foreground">
          Players
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {players?.length ?? 0} registered player
          {players?.length !== 1 ? "s" : ""}.
          Share your Player ID with admins to be added to a team.
        </p>

        {!players || players.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No players registered yet.{" "}
            <a href="/signup" className="text-amber hover:underline">
              Create a profile
            </a>{" "}
            to get your Player ID.
          </p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <Card key={player.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm font-semibold">
                      {initials(player.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {player.full_name}
                    </p>
                    <p className="font-mono text-xs text-amber">
                      {player.player_id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

