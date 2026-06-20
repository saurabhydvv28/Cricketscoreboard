import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-boundary/15">
              <AlertTriangle className="h-6 w-6 text-boundary" />
            </span>
            <CardTitle className="mt-3">Confirmation link issue</CardTitle>
            <CardDescription>
              {message ||
                'This link is invalid or has expired. Please try signing up or signing in again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
