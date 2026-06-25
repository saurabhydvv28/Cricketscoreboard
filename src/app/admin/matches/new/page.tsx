import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { CreateMatchForm } from '@/components/admin/create-match-form'
import { verifyAdminSession } from '@/lib/admin-auth'

export default async function NewMatchPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect('/admin/login')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="font-sans text-2xl font-bold text-foreground">Create a new match</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up details and assemble rosters. You can start the match after the toss.
          </p>
          <div className="mt-8">
            <CreateMatchForm />
          </div>
        </div>
      </main>
    </div>
  )
}
