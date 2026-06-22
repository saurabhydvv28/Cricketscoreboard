'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Trophy } from 'lucide-react'

import { createMatch, type CreateMatchFormState } from '@/lib/actions/matches'
import { PlayerPicker, type PlayerOption } from '@/components/admin/player-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const initialState: CreateMatchFormState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trophy className="h-4 w-4" />
      )}
      {pending ? 'Creating match…' : 'Create match'}
    </Button>
  )
}

export function CreateMatchForm() {
  const [state, formAction] = useFormState(createMatch, initialState)
  const [teamARoster, setTeamARoster] = useState<PlayerOption[]>([])
  const [teamBRoster, setTeamBRoster] = useState<PlayerOption[]>([])

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match details</CardTitle>
          <CardDescription>
            Name both teams and set the number of overs per innings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teamAName">Team A name</Label>
            <Input
              id="teamAName"
              name="teamAName"
              placeholder="Riverside Strikers"
              aria-invalid={!!state.fieldErrors?.teamAName}
            />
            {state.fieldErrors?.teamAName && (
              <p className="text-xs text-boundary">{state.fieldErrors.teamAName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamBName">Team B name</Label>
            <Input
              id="teamBName"
              name="teamBName"
              placeholder="Oakwood Warriors"
              aria-invalid={!!state.fieldErrors?.teamBName}
            />
            {state.fieldErrors?.teamBName && (
              <p className="text-xs text-boundary">{state.fieldErrors.teamBName}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="totalOvers">Overs per innings</Label>
            <Input
              id="totalOvers"
              name="totalOvers"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              defaultValue={20}
              className="max-w-[140px]"
              aria-invalid={!!state.fieldErrors?.totalOvers}
            />
            {state.fieldErrors?.totalOvers && (
              <p className="text-xs text-boundary">{state.fieldErrors.totalOvers}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assemble rosters</CardTitle>
          <CardDescription>
            Search by player name or Player ID. A player can only be added
            to one team.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <PlayerPicker
            name="teamARoster"
            label="Team A roster"
            selected={teamARoster}
            onChange={setTeamARoster}
            excludeIds={teamBRoster.map((p) => p.id)}
            error={state.fieldErrors?.teamARoster}
          />
          <PlayerPicker
            name="teamBRoster"
            label="Team B roster"
            selected={teamBRoster}
            onChange={setTeamBRoster}
            excludeIds={teamARoster.map((p) => p.id)}
            error={state.fieldErrors?.teamBRoster}
          />
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
