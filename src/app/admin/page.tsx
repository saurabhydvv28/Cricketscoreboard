import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

import { Navbar } from "@/components/shared/navbar"
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-boundary" />
          <h1 className="font-sans text-xl font-bold text-foreground">
            Admins only
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your account doesn&apos;t have admin access. Contact a league
            organizer if you believe this is a mistake.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-16">
        <h1 className="font-sans text-2xl font-bold text-foreground">
          Admin dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {profile.full_name}. Match creation and the live
          scoring console are coming in Steps 4 and 5.
        </p>
      </main>
    </div>
  )
}
