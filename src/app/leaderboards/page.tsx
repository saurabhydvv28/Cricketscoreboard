import { Navbar } from "@/components/shared/navbar"

export default function LeaderboardsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-16">
        <h1 className="font-sans text-2xl font-bold text-foreground">
          Leaderboards
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Orange Cap, Purple Cap, strike rate, and economy rate tables
          are coming in Step 7.
        </p>
      </main>
    </div>
  )
}
