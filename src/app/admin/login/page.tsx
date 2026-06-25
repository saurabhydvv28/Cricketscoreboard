'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock, Loader2 } from 'lucide-react'
import { adminLogin } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? 'Verifying…' : 'Enter admin panel'}
    </Button>
  )
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(adminLogin, { error: null })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15">
            <Lock className="h-6 w-6 text-amber" />
          </span>
          <CardTitle className="mt-3">Admin Panel</CardTitle>
          <CardDescription>
            Enter the admin PIN to access the scoring dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Admin PIN</Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                autoFocus
                aria-invalid={!!state.error}
              />
              {state.error && (
                <p className="text-xs text-boundary">{state.error}</p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
