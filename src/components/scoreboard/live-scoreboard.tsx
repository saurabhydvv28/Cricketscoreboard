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
  initialBalls: BallByBallLog[]
  allPlayers: Pick<Profile, 'id' | 'full_name'>[]
  innings1Balls: BallByBallLog[]
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name : `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

export function LiveScoreboard({
  initialMatch,
  initialBalls,
  allPlayers,
  innings1Balls,
}: LiveScoreboardProps) {
  const { match, recentBalls, isConnected } = useRealtimeMatch(initialMatch, initialBalls)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const live = match.live_data
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  // Determine batting team name for current innings
  const teamABatsInnings1 =
    (match.toss_winner === 'team_a' && match.toss_decision === 'bat') ||
    (match.toss_winner === 'team_b' && match.toss_decision === 'bowl')

  const battingTeamName =
    match.current_innings === 1
      ? teamABatsInnings1 ? match.team_a_name : match.team_b_name
      : teamABatsInnings1 ? match.team_b_name : match.team_a_name

  const striker = live.striker_id ? playerMap.get(live.striker_id) : null
  const nonStriker = live.non_striker_id ? playerMap.get(live.non_striker_id) : null
  const bowler = live.bowler_id ? playerMap.get(live.bowler_id) : null

  return (
    <div className="space-y-5">
      {/* Connection status indicator */}
      <div className="flex items-center justify-end gap-1.5">
        <span className={cn(
          'flex items-center gap-1 text-xs',
          isConnected ? 'text-pitch-green' : 'text-muted-foreground'
        )}>
          {isConnected
            ? <><Wifi className="h-3 w-3" /> Live</>
            : <><WifiOff className="h-3 w-3" /> Connecting…</>
          }
        </span>
      </div>

      {/* Current innings scoreboard ticker */}
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

      {/* Innings 2 target / required run rate */}
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
                {(match.total_overs * 6 - parseInt(live.overs.split('.')[0]) * 6 - parseInt(live.overs.split('.')[1]))} balls
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

      {/* Innings 1 summary (always shown once it's done) */}
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
      {isCompleted && (
        <MatchResult match={match} teamABatsInnings1={teamABatsInnings1} />
      )}

      {/* At the crease */}
      {isLive && (striker || nonStriker || bowler) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">At the crease</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0 text-sm sm:grid-cols-3">
            {striker && (
              <div>
                <p className="text-xs text-muted-foreground">Striker</p>
                <p className="font-medium text-amber">{shortName(striker.full_name)} *</p>
              </div>
            )}
            {nonStriker && (
              <div>
                <p className="text-xs text-muted-foreground">Non-striker</p>
                <p className="font-medium text-foreground">{shortName(nonStriker.full_name)}</p>
              </div>
            )}
            {bowler && (
              <div>
                <p className="text-xs text-muted-foreground">Bowler</p>
                <p className="font-medium text-foreground">{shortName(bowler.full_name)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ball-by-ball commentary */}
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

      {/* Full innings 2 scorecard when match is complete */}
      {isCompleted && recentBalls.length > 0 && (
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
              balls={recentBalls}
              players={playerMap}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MatchResult({
  match,
  teamABatsInnings1,
}: {
  match: Match
  teamABatsInnings1: boolean
}) {
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
