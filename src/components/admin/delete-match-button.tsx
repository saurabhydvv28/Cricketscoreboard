'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

import { deleteMatch } from '@/lib/actions/matches'
import { Button } from '@/components/ui/button'

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete match
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Are you sure?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteMatch(matchId)
            router.push('/admin')
          })
        }
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Yes, delete
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  )
}
