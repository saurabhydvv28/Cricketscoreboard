'use client'

import { useState, useTransition } from 'react'
import { Loader2, Radio } from 'lucide-react'

import { startMatch } from '@/lib/actions/matches'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TossFormProps {
  matchId: string
  teamAName: string
  teamBName: string
}

export function TossForm({ matchId, teamAName, teamBName }: TossFormProps) {
  const [winner, setWinner] = useState<'team_a' | 'team_b' | null>(null)
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleStart() {
    if (!winner || !decision) return
    setError(null)
    startTransition(async () => {
      try {
        await startMatch(matchId, winner, decision)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start match.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toss</CardTitle>
        <CardDescription>
          Record the toss result to start the match and open the scoring
          console.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Toss won by
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['team_a', 'team_b'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setWinner(value)}
                className={cn(
                  'rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                  winner === value
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                )}
              >
                {value === 'team_a' ? teamAName : teamBName}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Elected to
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['bat', 'bowl'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDecision(value)}
                className={cn(
                  'rounded-md border px-4 py-2.5 text-sm font-medium capitalize transition-colors',
                  decision === value
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
            {error}
          </p>
        )}

        <Button
          onClick={handleStart}
          disabled={!winner || !decision || isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          {isPending ? 'Starting…' : 'Start match'}
        </Button>
      </CardContent>
    </Card>
  )
}
