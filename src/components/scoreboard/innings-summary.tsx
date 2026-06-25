import type { BallByBallLog, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface BatsmanLine {
  id: string
  name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  isOut: boolean
  isAtCrease?: boolean  // currently batting (not out)
  isStriker?: boolean
  dismissalNote: string
}

interface BowlerLine {
  id: string
  name: string
  overs: string
  runs: number
  wickets: number
}

interface InningsSummaryProps {
  inningsNumber: 1 | 2
  score: number
  wickets: number
  overs: string
  balls: BallByBallLog[]
  players: Map<string, Pick<Profile, 'id' | 'full_name'>>
  strikerId?: string | null
  nonStrikerId?: string | null
  className?: string
}

function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return fullName
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

export function InningsSummary({
  inningsNumber,
  score,
  wickets,
  overs,
  balls,
  players,
  strikerId,
  nonStrikerId,
  className,
}: InningsSummaryProps) {
  // ---- Build batting lines ----
  const batsmanMap = new Map<string, BatsmanLine>()

  for (const ball of balls) {
    if (!batsmanMap.has(ball.batsman_id)) {
      batsmanMap.set(ball.batsman_id, {
        id: ball.batsman_id,
        name: shortName(players.get(ball.batsman_id)?.full_name ?? '???'),
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissalNote: 'not out',
      })
    }
    const line = batsmanMap.get(ball.batsman_id)!
    const runsOffBat =
      ball.extra_type === 'bye' || ball.extra_type === 'leg_bye' ? 0 : ball.runs_scored
    line.runs += runsOffBat
    if (ball.is_legal_delivery) line.balls++
    if (ball.runs_scored === 4) line.fours++
    if (ball.runs_scored === 6) line.sixes++
  }

  // Mark dismissed batsmen
  for (const ball of balls) {
    if (ball.is_wicket && ball.player_dismissed_id) {
      const line = batsmanMap.get(ball.player_dismissed_id)
      if (line) {
        line.isOut = true
        const fielder = ball.fielder_id
          ? ` ${shortName(players.get(ball.fielder_id)?.full_name ?? '???')}`
          : ''
        const bowler = shortName(players.get(ball.bowler_id)?.full_name ?? '???')
        switch (ball.wicket_type) {
          case 'bowled': line.dismissalNote = `b ${bowler}`; break
          case 'caught': line.dismissalNote = `c${fielder} b ${bowler}`; break
          case 'lbw': line.dismissalNote = `lbw b ${bowler}`; break
          case 'run_out': line.dismissalNote = `run out${fielder}`; break
          case 'stumped': line.dismissalNote = `st${fielder} b ${bowler}`; break
          case 'hit_wicket': line.dismissalNote = `hit wkt b ${bowler}`; break
          default: line.dismissalNote = ball.wicket_type ?? 'out'
        }
      }
    }
  }

  // Mark current batsmen at crease
  for (const entry of Array.from(batsmanMap.entries())) {
    const [id, line] = entry
    if (!line.isOut) {
      if (id === strikerId) { line.isAtCrease = true; line.isStriker = true }
      else if (id === nonStrikerId) { line.isAtCrease = true }
    }
  }

  // ---- Build bowling lines ----
  const bowlerMap = new Map<string, BowlerLine>()

  for (const ball of balls) {
    if (!bowlerMap.has(ball.bowler_id)) {
      bowlerMap.set(ball.bowler_id, {
        id: ball.bowler_id,
        name: shortName(players.get(ball.bowler_id)?.full_name ?? '???'),
        overs: '0.0', runs: 0, wickets: 0,
      })
    }
    const line = bowlerMap.get(ball.bowler_id)!
    line.runs += ball.runs_scored + ball.extra_runs
    if (ball.is_wicket && ball.wicket_type !== 'run_out') line.wickets++
  }

  for (const entry of Array.from(bowlerMap.entries())) {
    const [bowlerId, line] = entry
    const legalBalls = balls.filter((b) => b.bowler_id === bowlerId && b.is_legal_delivery).length
    line.overs = formatOvers(legalBalls)
  }

  const battingLines = Array.from(batsmanMap.values())
  const bowlingLines = Array.from(bowlerMap.values()).sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets
    return a.overs.localeCompare(b.overs)
  })

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Batting ── */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Innings {inningsNumber} batting
          </h3>
          <span className="scoreboard-numerals font-mono text-sm font-bold text-foreground">
            {score}/{wickets} ({overs})
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1 text-left font-medium">Batsman</th>
              <th className="py-1 text-right font-medium">R</th>
              <th className="py-1 text-right font-medium">B</th>
              <th className="py-1 text-right font-medium">4s</th>
              <th className="py-1 text-right font-medium">6s</th>
              <th className="py-1 text-right font-medium">SR</th>
            </tr>
          </thead>
          <tbody>
            {battingLines.map((line) => (
              <tr key={line.id} className={cn("border-b border-border/40", line.isAtCrease && "bg-amber/5")}>
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-medium", line.isStriker ? "text-amber" : "text-foreground")}>
                      {line.name}{line.isStriker && ' *'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {line.isAtCrease ? 'batting' : line.dismissalNote}
                  </div>
                </td>
                <td className={cn('py-1.5 text-right font-mono font-bold', line.runs >= 50 ? 'text-amber' : 'text-foreground')}>
                  {line.runs}
                </td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{line.balls}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{line.fours}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{line.sixes}</td>
                <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">
                  {line.balls > 0 ? ((line.runs / line.balls) * 100).toFixed(0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bowling ── */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bowling</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1 text-left font-medium">Bowler</th>
              <th className="py-1 text-right font-medium">O</th>
              <th className="py-1 text-right font-medium">R</th>
              <th className="py-1 text-right font-medium">W</th>
              <th className="py-1 text-right font-medium">Eco</th>
            </tr>
          </thead>
          <tbody>
            {bowlingLines.map((line) => {
              const [ovsPart, ballsPart] = line.overs.split('.')
              const totalLegal = parseInt(ovsPart) * 6 + parseInt(ballsPart)
              const eco = totalLegal > 0 ? ((line.runs / totalLegal) * 6).toFixed(2) : '—'
              return (
                <tr key={line.id} className="border-b border-border/40">
                  <td className="py-1.5 pr-3 font-medium text-foreground">{line.name}</td>
                  <td className="py-1.5 text-right font-mono text-muted-foreground">{line.overs}</td>
                  <td className="py-1.5 text-right font-mono text-muted-foreground">{line.runs}</td>
                  <td className={cn('py-1.5 text-right font-mono font-bold', line.wickets >= 3 ? 'text-boundary' : 'text-foreground')}>
                    {line.wickets}
                  </td>
                  <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">{eco}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
