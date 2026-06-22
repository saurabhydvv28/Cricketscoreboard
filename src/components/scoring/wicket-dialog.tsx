'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PlayerSelect, type ScoringPlayer } from '@/components/scoring/player-select'
import type { WicketType } from '@/types/database'
import { cn } from '@/lib/utils'

const WICKET_TYPES: { value: WicketType; label: string; needsFielder: boolean }[] = [
  { value: 'bowled', label: 'Bowled', needsFielder: false },
  { value: 'caught', label: 'Caught', needsFielder: true },
  { value: 'lbw', label: 'LBW', needsFielder: false },
  { value: 'run_out', label: 'Run out', needsFielder: true },
  { value: 'stumped', label: 'Stumped', needsFielder: true },
  { value: 'hit_wicket', label: 'Hit wicket', needsFielder: false },
  { value: 'obstructing_field', label: 'Obstructing the field', needsFielder: false },
  { value: 'timed_out', label: 'Timed out', needsFielder: false },
  { value: 'handled_ball', label: 'Handled the ball', needsFielder: false },
]

export interface WicketDetails {
  wicketType: WicketType
  playerDismissedId: string
  fielderId?: string
  // For a run-out on a non-strike-rotating ball, runs were still
  // attempted/run before the dismissal — admin records how many.
  runsBeforeDismissal: number
}

interface WicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strikerId: string
  nonStrikerId: string
  battingPlayers: ScoringPlayer[]
  fieldingPlayers: ScoringPlayer[]
  onConfirm: (details: WicketDetails) => void
}

function playerName(players: ScoringPlayer[], id: string) {
  return players.find((p) => p.id === id)?.full_name ?? 'Unknown'
}

export function WicketDialog({
  open,
  onOpenChange,
  strikerId,
  nonStrikerId,
  battingPlayers,
  fieldingPlayers,
  onConfirm,
}: WicketDialogProps) {
  const [wicketType, setWicketType] = useState<WicketType>('bowled')
  const [dismissed, setDismissed] = useState(strikerId)
  const [fielder, setFielder] = useState<string | null>(null)
  const [runsBeforeDismissal, setRunsBeforeDismissal] = useState(0)

  const selectedType = WICKET_TYPES.find((t) => t.value === wicketType)!

  function handleConfirm() {
    onConfirm({
      wicketType,
      playerDismissedId: dismissed,
      fielderId: fielder ?? undefined,
      runsBeforeDismissal,
    })
    onOpenChange(false)
    // Reset for next time
    setWicketType('bowled')
    setFielder(null)
    setRunsBeforeDismissal(0)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-raised p-6 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Wicket
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <Label>Dismissal type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {WICKET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setWicketType(t.value)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                      wicketType === t.value
                        ? 'border-amber bg-amber/10 text-amber'
                        : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Batsman out</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[strikerId, nonStrikerId].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDismissed(id)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      dismissed === id
                        ? 'border-amber bg-amber/10 text-amber'
                        : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                    )}
                  >
                    {playerName(battingPlayers, id)}
                  </button>
                ))}
              </div>
            </div>

            {selectedType.needsFielder && (
              <div className="space-y-1.5">
                <Label>Fielder</Label>
                <PlayerSelect
                  players={fieldingPlayers}
                  value={fielder}
                  onChange={setFielder}
                  placeholder="Select fielder"
                />
              </div>
            )}

            {wicketType === 'run_out' && (
              <div className="space-y-1.5">
                <Label>Runs fully completed before the dismissal</Label>
                <p className="text-xs text-muted-foreground">
                  Only count runs where both batsmen safely crossed.
                  Don&apos;t count the run in progress when the
                  fielder broke the stumps.
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRunsBeforeDismissal(r)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                        runsBeforeDismissal === r
                          ? 'border-amber bg-amber/10 text-amber'
                          : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={selectedType.needsFielder && !fielder}
              className="w-full"
              variant="destructive"
            >
              Confirm wicket
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
