import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Gold/silver/bronze rank badge for positions 1-3, plain number for 4-5. */
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber font-bold text-primary-foreground text-sm">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-semibold text-foreground text-sm border border-border">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full font-semibold text-amber-dim text-sm border border-amber-dim/40">
        3
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center font-mono text-sm text-muted-foreground">
      {rank}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function PlayerAvatar({
  fullName,
  avatarUrl,
  size = 'sm',
}: {
  fullName: string
  avatarUrl: string | null
  size?: 'sm' | 'md'
}) {
  return (
    <Avatar className={cn(size === 'md' ? 'h-10 w-10' : 'h-8 w-8')}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
      <AvatarFallback className={cn('text-xs font-semibold', size === 'md' && 'text-sm')}>
        {initials(fullName)}
      </AvatarFallback>
    </Avatar>
  )
}

/** A stat cell with a large mono number and a small label beneath. */
export function StatCell({
  value,
  label,
  highlight,
}: {
  value: string | number
  label: string
  highlight?: boolean
}) {
  return (
    <div className="text-right">
      <div
        className={cn(
          'scoreboard-numerals font-mono text-lg font-bold leading-none',
          highlight ? 'text-amber' : 'text-foreground'
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

/** Formats "full_overs.remaining_balls" from the bowling stats view. */
export function formatBowlingOvers(fullOvers: number, remainingBalls: number): string {
  return `${fullOvers}.${remainingBalls}`
}
