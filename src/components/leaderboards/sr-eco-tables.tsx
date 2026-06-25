import type { StrikeRateLeaderRow, EconomyRateLeaderRow } from '@/types/database'
import {
  RankBadge,
  PlayerAvatar,
  StatCell,
  formatBowlingOvers,
} from '@/components/leaderboards/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

/* ------------------------------------------------------------------ */
/* Strike Rate                                                         */
/* ------------------------------------------------------------------ */

interface StrikeRateTableProps {
  rows: StrikeRateLeaderRow[]
}

export function StrikeRateTable({ rows }: StrikeRateTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>⚡</span>
          <div>
            <CardTitle>Highest Strike Rate</CardTitle>
            <CardDescription>
              Min. 20 balls faced · (runs ÷ balls) × 100
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No players have faced 20+ balls yet.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((row) => (
              <div
                key={row.player_id}
                className="flex items-center gap-4 px-6 py-4"
              >
                <RankBadge rank={row.rank} />
                <PlayerAvatar fullName={row.full_name} avatarUrl={row.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {row.full_name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.player_slug} · {row.matches_played}M
                  </p>
                </div>
                <div className="flex items-end gap-5">
                  <StatCell
                    value={row.strike_rate.toFixed(1)}
                    label="SR"
                    highlight
                  />
                  <StatCell value={row.total_runs} label="Runs" />
                  <StatCell value={row.balls_faced} label="Balls" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Economy Rate                                                        */
/* ------------------------------------------------------------------ */

interface EconomyRateTableProps {
  rows: EconomyRateLeaderRow[]
}

export function EconomyRateTable({ rows }: EconomyRateTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>🎯</span>
          <div>
            <CardTitle>Best Economy Rate</CardTitle>
            <CardDescription>
              Min. 4 overs bowled · runs per over (lower is better)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No bowlers have bowled 4+ overs yet.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((row) => (
              <div
                key={row.player_id}
                className="flex items-center gap-4 px-6 py-4"
              >
                <RankBadge rank={row.rank} />
                <PlayerAvatar fullName={row.full_name} avatarUrl={row.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {row.full_name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.player_slug} · {row.matches_played}M
                  </p>
                </div>
                <div className="flex items-end gap-5">
                  <StatCell
                    value={row.economy_rate.toFixed(2)}
                    label="Eco"
                    highlight
                  />
                  <StatCell value={row.wickets} label="Wkts" />
                  <StatCell
                    value={formatBowlingOvers(row.full_overs, row.remaining_balls)}
                    label="Overs"
                  />
                  <StatCell value={row.runs_conceded} label="Runs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
