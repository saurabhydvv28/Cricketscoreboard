import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { UserMenu } from "@/components/shared/user-menu"

const navLinks = [
  { href: "/matches", label: "Matches" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/players", label: "Players" },
]

export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: { full_name: string; player_id: string; is_admin: boolean } | null = null

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, player_id, is_admin")
      .eq("id", user.id)
      .single()
    profile = data
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber font-mono text-sm font-bold text-primary-foreground">
            CS
          </span>
          <span className="font-sans text-lg font-bold tracking-tight text-foreground">
            Cricket Scoreboard
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <UserMenu
              fullName={profile.full_name}
              playerId={profile.player_id}
              isAdmin={profile.is_admin}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
