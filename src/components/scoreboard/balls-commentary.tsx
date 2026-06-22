import type { BallByBallLog, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface BallsCommentaryProps {
  balls: BallByBallLog[]
  players: Map<string, Pick<Profile, 'id' | 'full_name'>>
  maxBalls?: number
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name : `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

function ballDotColor(ball: BallByBallLog): string {
  if (ball.is_wicket) return 'bg-boundary text-white'
  if (ball.runs_scored === 6) return 'bg-amber text-primary-foreground'
  if (ball.runs_scored === 4) return 'bg-amber/60 text-primary-foreground'
  if (ball.extra_type !== 'none') return 'bg-surface text-muted-foreground border border-border'
  return 'bg-surface-raised text-foreground'
}

function ballDotLabel(ball: BallByBallLog): string {
  if (ball.is_wicket) return 'W'
  if (ball.extra_type === 'wide') return 'wd'
  if (ball.extra_type === 'no_ball') return 'nb'
  if (ball.extra_type === 'bye') return `${ball.extra_runs}b`
  if (ball.extra_type === 'leg_bye') return `${ball.extra_runs}lb`
  return String(ball.runs_scored)
}

function ballDescription(ball: BallByBallLog, players: Map<string, Pick<Profile, 'id' | 'full_name'>>): string {
  const batsman = shortName(players.get(ball.batsman_id)?.full_name ?? '???')
  const bowler = shortName(players.get(ball.bowler_id)?.full_name ?? '???')

  if (ball.is_wicket) {
    const dismissed = ball.player_dismissed_id
      ? shortName(players.get(ball.player_dismissed_id)?.full_name ?? '???')
      : batsman
    const fielder = ball.fielder_id
      ? shortName(players.get(ball.fielder_id)?.full_name ?? '???')
      : null
    switch (ball.wicket_type) {
      case 'bowled': return `${dismissed} bowled by ${bowler}!`
      case 'caught': return `${dismissed} caught${fielder ? ` by ${fielder}` : ''} off ${bowler}!`
      case 'lbw': return `${dismissed} lbw ${bowler}!`
      case 'run_out': return `${dismissed} run out${fielder ? ` (${fielder})` : ''}!`
      case 'stumped': return `${dismissed} stumped${fielder ? ` by ${fielder}` : ''} off ${bowler}!`
      case 'hit_wicket': return `${dismissed} hit wicket b ${bowler}!`
      default: return `${dismissed} out!`
    }
  }

  if (ball.extra_type === 'wide') {
    return `Wide by ${bowler}${ball.extra_runs > 1 ? ` — ${ball.extra_runs} runs` : ''}`
  }
  if (ball.extra_type === 'no_ball') {
    return `No ball by ${bowler}${ball.runs_scored > 0 ? ` — ${ball.runs_scored} off the bat` : ''}`
  }
  if (ball.extra_type === 'bye') {
    return `${ball.extra_runs} bye${ball.extra_runs !== 1 ? 's' : ''} — ${batsman} to ${bowler}`
  }
  if (ball.extra_type === 'leg_bye') {
    return `${ball.extra_runs} leg bye${ball.extra_runs !== 1 ? 's' : ''} — ${batsman} to ${bowler}`
  }

  const total = ball.runs_scored + ball.extra_runs
  if (total === 0) return `Dot ball — ${batsman} to ${bowler}`
  if (ball.runs_scored === 6) return `SIX! ${batsman} off ${bowler}`
  if (ball.runs_scored === 4) return `FOUR! ${batsman} off ${bowler}`
  return `${total} run${total !== 1 ? 's' : ''} — ${batsman} off ${bowler}`
}

export function BallsCommentary({ balls, players, maxBalls = 8 }: BallsCommentaryProps) {
  const displayed = balls.slice(0, maxBalls)

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No balls bowled yet this innings.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {displayed.map((ball) => (
        <div
          key={ball.id}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2',
            ball.is_wicket
              ? 'bg-boundary/10'
              : ball.runs_scored === 6 || ball.runs_scored === 4
              ? 'bg-amber/5'
              : 'bg-surface'
          )}
        >
          <span className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
            ballDotColor(ball)
          )}>
            {ballDotLabel(ball)}
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono text-[10px]">
              {ball.over_number}.{ball.ball_number}
            </span>
          </span>
          <span className={cn(
            'flex-1 text-sm',
            ball.is_wicket ? 'font-semibold text-boundary' : 'text-foreground'
          )}>
            {ballDescription(ball, players)}
          </span>
        </div>
      ))}
    </div>
  )
}
