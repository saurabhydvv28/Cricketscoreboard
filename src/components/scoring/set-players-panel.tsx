'use client'

import { useState, useTransition } from 'react'
import { Loader2, Users } from 'lucide-react'

import { setMatchPlayers } from '@/lib/actions/scoring'
import { PlayerSelect, type ScoringPlayer } from '@/components/scoring/player-select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface SetPlayersPanelProps {
  matchId: string
  battingPlayers: ScoringPlayer[]
  bowlingPlayers: ScoringPlayer[]
  dismissedIds: string[]
  needsStriker: boolean
  needsNonStriker: boolean
  needsBowler: boolean
  excludeBowlerId?: string | null
  title?: string
  description?: string
}

export function SetPlayersPanel({
  matchId,
  battingPlayers,
  bowlingPlayers,
  dismissedIds,
  needsStriker,
  needsNonStriker,
  needsBowler,
  excludeBowlerId,
  title = 'Set players',
  description = 'Choose who is at the crease and who is bowling before logging the next ball.',
}: SetPlayersPanelProps) {
  const [striker, setStriker] = useState<string | null>(null)
  const [nonStriker, setNonStriker] = useState<string | null>(null)
  const [bowler, setBowler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    (!needsStriker || striker) && (!needsNonStriker || nonStriker) && (!needsBowler || bowler)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        await setMatchPlayers(matchId, {
          ...(needsStriker && striker ? { strikerId: striker } : {}),
          ...(needsNonStriker && nonStriker ? { nonStrikerId: nonStriker } : {}),
          ...(needsBowler && bowler ? { bowlerId: bowler } : {}),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set players.')
      }
    })
  }

  return (
    <Card className="border-amber/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-amber" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsStriker && (
          <div className="space-y-1.5">
            <Label>Striker</Label>
            <PlayerSelect
              players={battingPlayers}
              value={striker}
              onChange={setStriker}
              placeholder="Select striker"
              excludeIds={[...dismissedIds, ...(nonStriker ? [nonStriker] : [])]}
            />
          </div>
        )}

        {needsNonStriker && (
          <div className="space-y-1.5">
            <Label>Non-striker</Label>
            <PlayerSelect
              players={battingPlayers}
              value={nonStriker}
              onChange={setNonStriker}
              placeholder="Select non-striker"
              excludeIds={[...dismissedIds, ...(striker ? [striker] : [])]}
            />
          </div>
        )}

        {needsBowler && (
          <div className="space-y-1.5">
            <Label>Bowler</Label>
            <PlayerSelect
              players={bowlingPlayers}
              value={bowler}
              onChange={setBowler}
              placeholder="Select bowler"
              excludeIds={excludeBowlerId ? [excludeBowlerId] : []}
            />
          </div>
        )}

        {error && (
          <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="w-full"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Saving…' : 'Confirm'}
        </Button>
      </CardContent>
    </Card>
  )
}
