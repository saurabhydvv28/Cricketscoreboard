'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { signup, type AuthFormState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: AuthFormState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? 'Creating account…' : 'Create player profile'}
    </Button>
  )
}

export function SignupForm() {
  const [state, formAction] = useFormState(signup, initialState)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Rohit Sharma"
          aria-invalid={!!state.fieldErrors?.fullName}
        />
        {state.fieldErrors?.fullName && (
          <p className="text-xs text-boundary">{state.fieldErrors.fullName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-boundary">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          aria-invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-boundary">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && (
        <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Already have a profile?{' '}
        <Link href="/login" className="font-medium text-amber hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
