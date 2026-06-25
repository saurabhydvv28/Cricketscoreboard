import Link from "next/link"
import { LayoutDashboard, LogOut } from "lucide-react"
import { verifyAdminSession } from "@/lib/admin-auth"
import { adminLogout } from "@/lib/actions/auth"

const navLinks = [
  { href: "/matches", label: "Matches" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/players", label: "Players" },
]

export async function Navbar() {
  const isAdmin = await verifyAdminSession()

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
          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm font-medium text-amber hover:text-amber/80"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-boundary transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
