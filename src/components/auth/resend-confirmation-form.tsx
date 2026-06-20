'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

import { resendConfirmation, type AuthFormState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ResendFormState extends AuthFormState {
  success?: boolean
}

const initialState: ResendFormState = { error: null }

async function resendAction(
  prevState: ResendFormState,
  formData: FormData
): Promise<ResendFormState> {
  const result = await resendConfirmation(prevState, formData)
  return { ...result, success: !result.error }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {pending ? 'Sending…' : 'Resend confirmation email'}
    </Button>
  )
}

export function ResendConfirmationForm() {
  const [state, formAction] = useFormState(resendAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-1.5 rounded-md bg-pitch-green/10 px-3 py-2 text-sm text-pitch-green">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Confirmation email sent.
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
