import type { OrangeCapRow } from '@/types/database'
import { RankBadge, PlayerAvatar, StatCell } from '@/components/leaderboards/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface OrangeCapTableProps {
  rows: OrangeCapRow[]
}

export function OrangeCapTable({ rows }: OrangeCapTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>🟠</span>
          <div>
            <CardTitle>Orange Cap</CardTitle>
            <CardDescription>Most runs across all matches</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No batting data yet. Stats appear once matches have been played.
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
                  <StatCell value={row.total_runs} label="Runs" highlight />
                  <StatCell value={row.balls_faced} label="Balls" />
                  <StatCell value={row.fours} label="4s" />
                  <StatCell value={row.sixes} label="6s" />
                  <StatCell
                    value={row.strike_rate.toFixed(1)}
                    label="SR"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
