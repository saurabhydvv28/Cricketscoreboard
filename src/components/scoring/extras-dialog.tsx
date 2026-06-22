'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ExtraType } from '@/types/database'
import { cn } from '@/lib/utils'

interface ExtrasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extraType: ExtraType | null
  onConfirm: (runsRun: number, extraRuns: number) => void
}

const LABELS: Record<string, string> = {
  wide: 'Wide',
  no_ball: 'No ball',
  bye: 'Bye',
  leg_bye: 'Leg bye',
}

export function ExtrasDialog({ open, onOpenChange, extraType, onConfirm }: ExtrasDialogProps) {
  const [additionalRuns, setAdditionalRuns] = useState(0)

  if (!extraType || extraType === 'none') return null

  const isWideOrNoBall = extraType === 'wide' || extraType === 'no_ball'
  const label = LABELS[extraType] ?? extraType

  function handleConfirm() {
    if (isWideOrNoBall) {
      // Wide/no-ball always carries the mandatory +1 extra run, plus
      // any additional runs run between the wickets (e.g. batsmen ran
      // on a wide that beat the keeper). runsRun reflects only the
      // runs physically run (drives strike rotation); extraRuns is
      // the total penalty-plus-run total added to the score.
      onConfirm(additionalRuns, 1 + additionalRuns)
    } else {
      // Bye / leg-bye: all of additionalRuns were both run AND scored.
      onConfirm(additionalRuns, additionalRuns)
    }
    onOpenChange(false)
    setAdditionalRuns(0)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-raised p-6 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {label}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {isWideOrNoBall
              ? 'Extra runs run on top of the automatic penalty run.'
              : 'How many runs were run?'}
          </p>

          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2, 3, 4].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setAdditionalRuns(r)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                  additionalRuns === r
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <Button onClick={handleConfirm} className="mt-5 w-full">
            Confirm
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
