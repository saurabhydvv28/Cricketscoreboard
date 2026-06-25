'use client'

import { useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { deletePlayer } from '@/lib/actions/matches'

export function DeletePlayerButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-boundary transition-colors"
        title={`Remove ${playerName}`}
      >
        <X className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startTransition(() => deletePlayer(playerId))}
        disabled={isPending}
        className="text-xs font-medium text-boundary hover:underline disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  )
}
