import { redirect } from 'next/navigation'
import { Radio } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15">
              <Radio className="h-6 w-6 text-amber" />
            </span>
            <CardTitle className="mt-3">Sign in</CardTitle>
            <CardDescription>
              Welcome back. Sign in to view your profile or, if you&apos;re
              an admin, manage matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm redirectTo={redirectTo} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
