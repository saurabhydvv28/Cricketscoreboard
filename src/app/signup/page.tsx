import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15">
              <Trophy className="h-6 w-6 text-amber" />
            </span>
            <CardTitle className="mt-3">Create your player profile</CardTitle>
            <CardDescription>
              Get a unique Player ID so admins can add you to a team
              roster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>
      </main>
      <footer className="border-t border-border py-6">
        <div className="container text-center text-xs text-muted-foreground">
          By signing up you agree this is a local cricket league scoring
          tool. <Link href="/" className="hover:text-foreground">Back home</Link>
        </div>
      </footer>
    </div>
  )
}
