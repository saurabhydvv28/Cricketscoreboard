'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { createPlayer } from '@/lib/actions/matches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRef } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {pending ? 'Adding…' : 'Add player'}
    </Button>
  )
}

export function AddPlayerForm() {
  const [state, formAction] = useFormState(createPlayer, { error: null })
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-reset form on success
  if (state.success && formRef.current) {
    formRef.current.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a new player</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="fullName" className="sr-only">Player name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Full name, e.g. Rohit Sharma"
              aria-invalid={!!state.error}
            />
            {state.error && (
              <p className="text-xs text-boundary">{state.error}</p>
            )}
            {state.success && (
              <p className="flex items-center gap-1 text-xs text-pitch-green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {state.success}
              </p>
            )}
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
