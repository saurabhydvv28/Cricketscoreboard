import { Mail } from 'lucide-react'

import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResendConfirmationForm } from '@/components/auth/resend-confirmation-form'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pitch-green/20">
              <Mail className="h-6 w-6 text-pitch-green" />
            </span>
            <CardTitle className="mt-3">Check your inbox</CardTitle>
            <CardDescription>
              We sent a confirmation link to your email. Click it to
              activate your player profile, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResendConfirmationForm />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
