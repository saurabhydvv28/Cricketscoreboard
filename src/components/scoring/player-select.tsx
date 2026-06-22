'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ScoringPlayer = {
  id: string
  full_name: string
  player_id: string
}

interface PlayerSelectProps {
  players: ScoringPlayer[]
  value: string | null
  onChange: (playerId: string) => void
  placeholder: string
  excludeIds?: string[]
  disabled?: boolean
}

export function PlayerSelect({
  players,
  value,
  onChange,
  placeholder,
  excludeIds = [],
  disabled,
}: PlayerSelectProps) {
  const excludeSet = new Set(excludeIds)
  const available = players.filter((p) => !excludeSet.has(p.id))

  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {available.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No players available
          </div>
        )}
        {available.map((player) => (
          <SelectItem key={player.id} value={player.id}>
            {player.full_name}{' '}
            <span className="font-mono text-xs text-muted-foreground">
              {player.player_id}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
