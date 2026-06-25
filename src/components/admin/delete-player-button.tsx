'use client'

import { useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { deletePlayer } from '@/lib/actions/matches'

export function DeletePlayerButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const err = await deletePlayer(playerId)
      if (err) {
        setError(err)
        setConfirming(false)
      }
    })
  }

  if (error) {
    return (
      <span className="text-xs text-boundary">
        {error}{' '}
        <button onClick={() => setError(null)} className="underline">Dismiss</button>
      </span>
    )
  }

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
        onClick={handleDelete}
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
