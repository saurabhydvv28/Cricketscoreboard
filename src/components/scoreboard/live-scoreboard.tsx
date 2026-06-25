'use client'

import { Wifi, WifiOff } from 'lucide-react'

import { useRealtimeMatch } from '@/hooks/use-realtime-match'
import { ScoreboardTicker } from '@/components/shared/scoreboard-ticker'
import { BallsCommentary } from '@/components/scoreboard/balls-commentary'
import { InningsSummary } from '@/components/scoreboard/innings-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BallByBallLog, Match, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface LiveScoreboardProps {
  initialMatch: Match
  initialBalls: BallByBallLog[]    // recent 12, descending — seeds Realtime hook
  allCurrentBalls: BallByBallLog[] // full current innings, ascending — for scorecards
  allPlayers: Pick<Profile, 'id' | 'full_name'>[]
  innings1Balls: BallByBallLog[]
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name : `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

// Computes a batsman's stats from the ball log for the current innings
function batsmanStats(
  playerId: string,
  balls: BallByBallLog[]
): { runs: number; balls: number; fours: number; sixes: number } {
  let runs = 0, ballsFaced = 0, fours = 0, sixes = 0
  for (const b of balls) {
    if (b.batsman_id !== playerId) continue
    const runsOffBat = b.extra_type === 'bye' || b.extra_type === 'leg_bye' ? 0 : b.runs_scored
    runs += runsOffBat
    if (b.is_legal_delivery) ballsFaced++
    if (b.runs_scored === 4) fours++
    if (b.runs_scored === 6) sixes++
  }
  return { runs, balls: ballsFaced, fours, sixes }
}

export function LiveScoreboard({
  initialMatch,
  initialBalls,
  allCurrentBalls,
  allPlayers,
  innings1Balls,
}: LiveScoreboardProps) {
  const { match, recentBalls, isConnected } = useRealtimeMatch(initialMatch, initialBalls)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const live = match.live_data
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  // Use allCurrentBalls (full history) for stat computation,
  // supplemented by any new balls that arrived via Realtime since SSR.
  const latestIds = new Set(allCurrentBalls.map((b) => b.id))
  const newBalls = recentBalls.filter((b) => !latestIds.has(b.id))
  const fullCurrentBalls = [...allCurrentBalls, ...newBalls.reverse()]

  const teamABatsInnings1 =
    (match.toss_winner === 'team_a' && match.toss_decision === 'bat') ||
    (match.toss_winner === 'team_b' && match.toss_decision === 'bowl')

  const battingTeamName =
    match.current_innings === 1
      ? teamABatsInnings1 ? match.team_a_name : match.team_b_name
      : teamABatsInnings1 ? match.team_b_name : match.team_a_name

  // Compute live batsman stats from the full ball history
  const strikerLiveStats = live.striker_id ? batsmanStats(live.striker_id, fullCurrentBalls) : null
  const nonStrikerLiveStats = live.non_striker_id ? batsmanStats(live.non_striker_id, fullCurrentBalls) : null
  const bowlerLiveStats = live.bowler_id
    ? (() => {
        let runs = 0, balls = 0, wickets = 0
        for (const b of fullCurrentBalls) {
          if (b.bowler_id !== live.bowler_id) continue
          runs += b.runs_scored + b.extra_runs
          if (b.is_legal_delivery) balls++
          if (b.is_wicket && b.wicket_type !== 'run_out') wickets++
        }
        return { runs, balls, wickets }
      })()
    : null

  const strikerName = live.striker_id ? playerMap.get(live.striker_id) : null
  const nonStrikerName = live.non_striker_id ? playerMap.get(live.non_striker_id) : null
  const bowlerName = live.bowler_id ? playerMap.get(live.bowler_id) : null

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className="flex items-center justify-end gap-1.5">
        <span className={cn('flex items-center gap-1 text-xs', isConnected ? 'text-pitch-green' : 'text-muted-foreground')}>
          {isConnected ? <><Wifi className="h-3 w-3" /> Live</> : <><WifiOff className="h-3 w-3" /> Connecting…</>}
        </span>
      </div>

      {/* Current innings ScoreboardTicker */}
      {(isLive || isCompleted) && (
        <ScoreboardTicker
          teamName={battingTeamName}
          score={live.score}
          wickets={live.wickets}
          overs={live.overs}
          totalOvers={match.total_overs}
          runRate={live.run_rate}
          isLive={isLive}
          currentOverBalls={live.current_over_balls.map((b) => ({
            label: b.label,
            isWicket: b.is_wicket,
            isBoundary: b.runs === 4 || b.runs === 6,
          }))}
        />
      )}

      {/* Innings 2 target/RRR */}
      {match.current_innings === 2 && live.target !== null && isLive && (
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {battingTeamName} need{' '}
              <span className="font-mono font-bold text-amber">
                {Math.max(0, live.target - live.score)}
              </span>{' '}
              runs from{' '}
              <span className="font-mono font-bold text-amber">
                {Math.max(0, match.total_overs * 6 - (parseInt(live.overs.split('.')[0]) * 6 + parseInt(live.overs.split('.')[1])))} balls
              </span>
            </span>
            {live.required_run_rate !== null && (
              <span className="text-xs text-muted-foreground">
                RRR <span className="font-mono text-amber">{live.required_run_rate.toFixed(2)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── AT THE CREASE — with runs (balls) stats ── */}
      {isLive && (strikerName || nonStrikerName || bowlerName) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">At the crease</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Batting pair */}
              {(strikerName || nonStrikerName) && (
                <div className="space-y-2">
                  {strikerName && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-primary-foreground">
                          *
                        </span>
                        <span className="font-semibold text-amber">{shortName(strikerName.full_name)}</span>
                        <span className="text-xs text-muted-foreground">striker</span>
                      </div>
                      {strikerLiveStats && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="scoreboard-numerals font-mono font-bold text-amber">
                            {strikerLiveStats.runs}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({strikerLiveStats.balls} balls)
                          </span>
                          {strikerLiveStats.fours > 0 && (
                            <span className="text-xs text-muted-foreground">{strikerLiveStats.fours}×4</span>
                          )}
                          {strikerLiveStats.sixes > 0 && (
                            <span className="text-xs text-muted-foreground">{strikerLiveStats.sixes}×6</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {nonStrikerName && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                          —
                        </span>
                        <span className="font-medium text-foreground">{shortName(nonStrikerName.full_name)}</span>
                        <span className="text-xs text-muted-foreground">non-striker</span>
                      </div>
                      {nonStrikerLiveStats && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="scoreboard-numerals font-mono font-bold text-foreground">
                            {nonStrikerLiveStats.runs}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({nonStrikerLiveStats.balls} balls)
                          </span>
                          {nonStrikerLiveStats.fours > 0 && (
                            <span className="text-xs text-muted-foreground">{nonStrikerLiveStats.fours}×4</span>
                          )}
                          {nonStrikerLiveStats.sixes > 0 && (
                            <span className="text-xs text-muted-foreground">{nonStrikerLiveStats.sixes}×6</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Separator */}
              {(strikerName || nonStrikerName) && bowlerName && (
                <div className="border-t border-border/40" />
              )}

              {/* Bowler */}
              {bowlerName && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                      B
                    </span>
                    <span className="font-medium text-foreground">{shortName(bowlerName.full_name)}</span>
                    <span className="text-xs text-muted-foreground">bowling</span>
                  </div>
                  {bowlerLiveStats && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-foreground">
                        {bowlerLiveStats.runs}/{bowlerLiveStats.wickets}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.floor(bowlerLiveStats.balls / 6)}.{bowlerLiveStats.balls % 6} ov)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Innings 1 summary */}
      {(match.current_innings === 2 || isCompleted) && match.innings1_score !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{teamABatsInnings1 ? match.team_a_name : match.team_b_name} — 1st innings</span>
              <span className="scoreboard-numerals font-mono text-base">
                {match.innings1_score}/{match.innings1_wickets} ({match.innings1_overs})
              </span>
            </CardTitle>
          </CardHeader>
          {innings1Balls.length > 0 && (
            <CardContent className="pt-0">
              <InningsSummary
                inningsNumber={1}
                score={match.innings1_score}
                wickets={match.innings1_wickets ?? 0}
                overs={String(match.innings1_overs ?? '0.0')}
                balls={innings1Balls}
                players={playerMap}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Match result */}
      {isCompleted && <MatchResult match={match} teamABatsInnings1={teamABatsInnings1} />}

      {/* Ball commentary */}
      {isLive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Recent balls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BallsCommentary balls={recentBalls} players={playerMap} />
          </CardContent>
        </Card>
      )}

      {/* Completed innings 2 scorecard */}
      {isCompleted && fullCurrentBalls.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {teamABatsInnings1 ? match.team_b_name : match.team_a_name} — 2nd innings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InningsSummary
              inningsNumber={2}
              score={live.score}
              wickets={live.wickets}
              overs={live.overs}
              balls={fullCurrentBalls}
              players={playerMap}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MatchResult({ match, teamABatsInnings1 }: { match: Match; teamABatsInnings1: boolean }) {
  const { innings1_score, live_data } = match
  const innings2Score = live_data.score
  const innings2Wickets = live_data.wickets

  const team1Name = teamABatsInnings1 ? match.team_a_name : match.team_b_name
  const team2Name = teamABatsInnings1 ? match.team_b_name : match.team_a_name

  if (innings1_score === null) return null

  let resultText: string
  if (innings2Score > innings1_score) {
    const wicketsLeft = (
      (teamABatsInnings1 ? match.team_b_roster : match.team_a_roster).length - 1
    ) - innings2Wickets
    resultText = `${team2Name} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`
  } else if (innings2Score < innings1_score) {
    const margin = innings1_score - innings2Score
    resultText = `${team1Name} won by ${margin} run${margin !== 1 ? 's' : ''}`
  } else {
    resultText = 'Match tied!'
  }

  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 px-5 py-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Result</p>
      <p className="mt-1 text-lg font-bold text-amber">{resultText}</p>
    </div>
  )
}
