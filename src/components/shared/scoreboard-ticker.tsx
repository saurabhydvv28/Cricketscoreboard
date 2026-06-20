import { cn } from "@/lib/utils"

interface ScoreboardTickerProps {
  teamName: string
  score: number
  wickets: number
  overs: string // e.g. "5.4"
  totalOvers: number
  runRate?: number
  currentOverBalls?: Array<{ label: string; isWicket?: boolean; isBoundary?: boolean }>
  isLive?: boolean
  className?: string
}

/**
 * The signature visual element of the app: a stadium-LED-style score
 * readout. Tabular mono digits for the score (so they don't jitter as
 * they update in real time), with a row of ball-by-ball dots for the
 * current over — mirroring real broadcast graphics.
 */
export function ScoreboardTicker({
  teamName,
  score,
  wickets,
  overs,
  totalOvers,
  runRate,
  currentOverBalls = [],
  isLive = false,
  className,
}: ScoreboardTickerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-raised px-5 py-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {teamName}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-boundary">
              <span className="live-pulse h-1.5 w-1.5 rounded-full bg-boundary" />
              Live
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Overs {totalOvers}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="scoreboard-numerals font-mono text-5xl font-bold text-foreground">
          {score}
          <span className="text-muted-foreground">/{wickets}</span>
        </span>
        <span className="scoreboard-numerals font-mono text-lg text-amber">
          ({overs})
        </span>
      </div>

      {runRate !== undefined && (
        <div className="mt-1 font-mono text-xs text-muted-foreground">
          RR {runRate.toFixed(2)}
        </div>
      )}

      {currentOverBalls.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            This over
          </span>
          {currentOverBalls.map((ball, i) => (
            <span
              key={i}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
                ball.isWicket
                  ? "bg-boundary text-white"
                  : ball.isBoundary
                  ? "bg-amber text-primary-foreground"
                  : "bg-surface text-foreground"
              )}
            >
              {ball.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
