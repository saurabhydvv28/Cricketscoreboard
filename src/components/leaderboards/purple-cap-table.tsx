import type { PurpleCapRow } from '@/types/database'
import {
  RankBadge,
  PlayerAvatar,
  StatCell,
  formatBowlingOvers,
} from '@/components/leaderboards/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PurpleCapTableProps {
  rows: PurpleCapRow[]
}

export function PurpleCapTable({ rows }: PurpleCapTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>🟣</span>
          <div>
            <CardTitle>Purple Cap</CardTitle>
            <CardDescription>Most wickets across all matches</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No bowling data yet. Stats appear once matches have been played.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((row) => {
              const eco =
                row.legal_balls > 0
                  ? ((row.runs_conceded / row.legal_balls) * 6).toFixed(2)
                  : '—'
              return (
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
                    <StatCell value={row.wickets} label="Wkts" highlight />
                    <StatCell
                      value={formatBowlingOvers(row.full_overs, row.remaining_balls)}
                      label="Overs"
                    />
                    <StatCell value={row.runs_conceded} label="Runs" />
                    <StatCell value={eco} label="Eco" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
