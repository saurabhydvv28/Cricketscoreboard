'use client'

import { useState, useTransition } from 'react'
import { Loader2, Undo2 } from 'lucide-react'

import { recordBall, undoLastBall } from '@/lib/actions/scoring'
import type { BallInput } from '@/lib/cricket/scoring'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreboardTicker } from '@/components/shared/scoreboard-ticker'
import { WicketDialog, type WicketDetails } from '@/components/scoring/wicket-dialog'
import { ExtrasDialog } from '@/components/scoring/extras-dialog'
import { SetPlayersPanel } from '@/components/scoring/set-players-panel'
import type { ScoringPlayer } from '@/components/scoring/player-select'
import type { ExtraType, LiveMatchData } from '@/types/database'
import { cn } from '@/lib/utils'

interface ScoringConsoleProps {
  matchId: string
  teamName: string
  totalOvers: number
  liveData: LiveMatchData
  battingPlayers: ScoringPlayer[]
  bowlingPlayers: ScoringPlayer[]
  dismissedIds: string[]
  previousOverBowlerId: string | null
}

function playerName(players: ScoringPlayer[], id: string | null) {
  if (!id) return '—'
  return players.find((p) => p.id === id)?.full_name ?? 'Unknown'
}

export function ScoringConsole({
  matchId,
  teamName,
  totalOvers,
  liveData,
  battingPlayers,
  bowlingPlayers,
  dismissedIds,
  previousOverBowlerId,
}: ScoringConsoleProps) {
  const [wicketOpen, setWicketOpen] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [pendingExtraType, setPendingExtraType] = useState<ExtraType | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    needsNewBatsman: boolean
    needsNewBowler: boolean
    isInningsEnd: boolean
  } | null>(null)

  const needsStriker = !liveData.striker_id
  const needsNonStriker = !liveData.non_striker_id
  const needsBowler = !liveData.bowler_id
  const needsAnyPlayer = needsStriker || needsNonStriker || needsBowler

  function submitBall(input: BallInput) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await recordBall(matchId, input)
        setLastResult(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to record ball.')
      }
    })
  }

  function handleRuns(runs: number) {
    submitBall({
      runsRun: runs,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    })
  }

  function handleExtraType(type: ExtraType) {
    setPendingExtraType(type)
    setExtrasOpen(true)
  }

  function handleExtraConfirm(runsRun: number, extraRuns: number) {
    if (!pendingExtraType) return
    submitBall({
      runsRun,
      extraType: pendingExtraType,
      extraRuns,
      isWicket: false,
    })
    setPendingExtraType(null)
  }

  function handleWicketConfirm(details: WicketDetails) {
    submitBall({
      runsRun: details.runsBeforeDismissal,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: details.wicketType,
      playerDismissedId: details.playerDismissedId,
      fielderId: details.fielderId,
    })
  }

  function handleUndo() {
    setError(null)
    startTransition(async () => {
      try {
        await undoLastBall(matchId)
        setLastResult(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to undo.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <ScoreboardTicker
        teamName={teamName}
        score={liveData.score}
        wickets={liveData.wickets}
        overs={liveData.overs}
        totalOvers={totalOvers}
        runRate={liveData.run_rate}
        isLive
        currentOverBalls={liveData.current_over_balls.map((b) => ({
          label: b.label,
          isWicket: b.is_wicket,
          isBoundary: b.runs === 4 || b.runs === 6,
        }))}
      />

      {liveData.target !== null && (
        <p className="text-center text-sm text-muted-foreground">
          Target <span className="font-mono text-amber">{liveData.target}</span>
          {liveData.required_run_rate !== null && (
            <>
              {' '}· Required run rate{' '}
              <span className="font-mono text-amber">
                {liveData.required_run_rate.toFixed(2)}
              </span>
            </>
          )}
        </p>
      )}

      {needsAnyPlayer ? (
        <SetPlayersPanel
          matchId={matchId}
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          dismissedIds={dismissedIds}
          needsStriker={needsStriker}
          needsNonStriker={needsNonStriker}
          needsBowler={needsBowler}
          excludeBowlerId={previousOverBowlerId}
          title={lastResult?.isInningsEnd === false && lastResult?.needsNewBowler ? 'New over' : 'Set players'}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                At the crease
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-0 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Striker</p>
                <p className="font-medium text-amber">
                  {playerName(battingPlayers, liveData.striker_id)} *
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Non-striker</p>
                <p className="font-medium text-foreground">
                  {playerName(battingPlayers, liveData.non_striker_id)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Bowler</p>
                <p className="font-medium text-foreground">
                  {playerName(bowlingPlayers, liveData.bowler_id)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-6 gap-2 pt-0">
              {[0, 1, 2, 3, 4, 6].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRuns(r)}
                  className={cn(
                    'flex h-14 items-center justify-center rounded-md border text-lg font-bold transition-colors disabled:opacity-50',
                    r === 4 || r === 6
                      ? 'border-amber/40 bg-amber/10 text-amber hover:bg-amber/20'
                      : 'border-border bg-surface text-foreground hover:bg-surface-raised'
                  )}
                >
                  {r}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Extras &amp; wicket
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-5">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleExtraType('wide')}
              >
                Wide
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleExtraType('no_ball')}
              >
                No ball
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleExtraType('bye')}
              >
                Bye
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleExtraType('leg_bye')}
              >
                Leg bye
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => setWicketOpen(true)}
              >
                Wicket
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Undo last ball
            </Button>
          </div>
        </>
      )}

      {error && (
        <p className="rounded-md bg-boundary/10 px-3 py-2 text-sm text-boundary">
          {error}
        </p>
      )}

      {liveData.striker_id && liveData.non_striker_id && (
        <WicketDialog
          open={wicketOpen}
          onOpenChange={setWicketOpen}
          strikerId={liveData.striker_id}
          nonStrikerId={liveData.non_striker_id}
          battingPlayers={battingPlayers}
          fieldingPlayers={bowlingPlayers}
          onConfirm={handleWicketConfirm}
        />
      )}

      <ExtrasDialog
        open={extrasOpen}
        onOpenChange={setExtrasOpen}
        extraType={pendingExtraType}
        onConfirm={handleExtraConfirm}
      />
    </div>
  )
}
