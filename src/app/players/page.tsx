import { Navbar } from "@/components/shared/navbar"

export default function PlayersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-16">
        <h1 className="font-sans text-2xl font-bold text-foreground">
          Players
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Player directory and profiles are coming in Step 3.
        </p>
      </main>
    </div>
  )
}
