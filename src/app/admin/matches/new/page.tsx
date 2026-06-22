import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { CreateMatchForm } from '@/components/admin/create-match-form'
import { createClient } from '@/lib/supabase/server'

export default async function NewMatchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/admin/matches/new')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <h1 className="font-sans text-2xl font-bold text-foreground">
            Create a new match
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up the match details and assemble both team rosters. You
            can start the match (toss + go live) afterward.
          </p>

          <div className="mt-8">
            <CreateMatchForm />
          </div>
        </div>
      </main>
    </div>
  )
}
