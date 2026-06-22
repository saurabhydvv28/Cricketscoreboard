'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Search, X, UserPlus } from 'lucide-react'

import { searchPlayers } from '@/lib/actions/matches'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type PlayerOption = {
  id: string
  full_name: string
  player_id: string
  avatar_url: string | null
}

interface PlayerPickerProps {
  name: string // form field name, e.g. "teamARoster"
  label: string
  selected: PlayerOption[]
  onChange: (players: PlayerOption[]) => void
  excludeIds?: string[] // players already on the other team
  error?: string
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function PlayerPicker({
  name,
  label,
  selected,
  onChange,
  excludeIds = [],
  error,
}: PlayerPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerOption[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(async () => {
        const data = await searchPlayers(query)
        setResults(data)
      })
    }, 250)
    return () => clearTimeout(handler)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedIds = new Set(selected.map((p) => p.id))
  const excludeSet = new Set(excludeIds)

  function addPlayer(player: PlayerOption) {
    if (selectedIds.has(player.id)) return
    onChange([...selected, player])
    setQuery('')
    setOpen(false)
  }

  function removePlayer(id: string) {
    onChange(selected.filter((p) => p.id !== id))
  }

  const filteredResults = results.filter(
    (p) => !selectedIds.has(p.id) && !excludeSet.has(p.id)
  )

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {/* Hidden inputs so the parent <form> submits selected player IDs */}
      {selected.map((p) => (
        <input key={p.id} type="hidden" name={name} value={p.id} />
      ))}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or Player ID…"
          className="pl-9"
          aria-invalid={!!error}
        />

        {open && (query.length > 0 || results.length > 0) && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface-raised shadow-lg">
            {isPending && (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!isPending && filteredResults.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No players found.
              </div>
            )}
            {!isPending &&
              filteredResults.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => addPlayer(player)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">
                      {initials(player.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{player.full_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {player.player_id}
                  </span>
                  <UserPlus className="h-3.5 w-3.5 text-amber" />
                </button>
              ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-boundary">{error}</p>}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selected.map((player) => (
            <span
              key={player.id}
              className={cn(
                'flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-xs'
              )}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]">
                  {initials(player.full_name)}
                </AvatarFallback>
              </Avatar>
              {player.full_name}
              <button
                type="button"
                onClick={() => removePlayer(player.id)}
                className="ml-0.5 text-muted-foreground hover:text-boundary"
                aria-label={`Remove ${player.full_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {selected.length} player{selected.length === 1 ? '' : 's'} added
      </p>
    </div>
  )
}
