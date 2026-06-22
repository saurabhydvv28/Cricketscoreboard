'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  battingRoster,
  computeNextLiveData,
  freshInningsLiveData,
  type BallInput,
} from '@/lib/cricket/scoring'
import type { Match } from '@/types/database'

// ----------------------------------------------------------------
// Shared admin guard, mirrors src/lib/actions/matches.ts. RLS is the
// real enforcement layer (is_admin() on matches/ball_by_ball_logs
// write policies) — this just gives a friendly error/redirect first.
// ----------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    throw new Error('Admin access required.')
  }

  return { supabase, user }
}

async function getMatchOrThrow(matchId: string): Promise<Match> {
  const supabase = await createClient()
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (error || !match) {
    throw new Error('Match not found.')
  }
  return match
}

// ----------------------------------------------------------------
// Set the opening striker, non-striker, and opening bowler for an
// innings. Required before the first ball can be logged, and also
// used to select a new batsman after a wicket or a new bowler after
// an over completes (the relevant field(s) are passed; others can be
// omitted to leave them unchanged).
// ----------------------------------------------------------------
export async function setMatchPlayers(
  matchId: string,
  updates: {
    strikerId?: string
    nonStrikerId?: string
    bowlerId?: string
  }
) {
  await requireAdmin()
  const match = await getMatchOrThrow(matchId)

  const nextLiveData = {
    ...match.live_data,
    ...(updates.strikerId !== undefined && { striker_id: updates.strikerId }),
    ...(updates.nonStrikerId !== undefined && { non_striker_id: updates.nonStrikerId }),
    ...(updates.bowlerId !== undefined && { bowler_id: updates.bowlerId }),
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ live_data: nextLiveData })
    .eq('id', matchId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/admin/matches/${matchId}/score`)
  revalidatePath(`/matches/${matchId}`)
}

// ----------------------------------------------------------------
// The core scoring action: record one ball. Computes the next
// live_data via the pure scoring module, inserts the
// ball_by_ball_logs row, and persists both atomically as far as the
// UI is concerned (two writes, but the second only runs if the first
// succeeds, and a failure surfaces as a thrown error rather than a
// silently inconsistent state).
// ----------------------------------------------------------------
export async function recordBall(matchId: string, input: BallInput) {
  await requireAdmin()
  const match = await getMatchOrThrow(matchId)

  if (match.status !== 'live') {
    throw new Error('Match is not live.')
  }
  if (!match.live_data.striker_id || !match.live_data.non_striker_id) {
    throw new Error('Set the striker and non-striker before scoring.')
  }
  if (!match.live_data.bowler_id) {
    throw new Error('Select a bowler before scoring.')
  }
  if (input.isWicket && !input.playerDismissedId) {
    throw new Error('Select which batsman was dismissed.')
  }

  const battingSize = battingRoster(match).length

  const result = computeNextLiveData({
    current: match.live_data,
    input,
    totalOvers: match.total_overs,
    battingTeamRosterSize: battingSize,
    inningsNumber: match.current_innings,
    target: match.live_data.target,
  })

  const supabase = await createClient()

  const { error: insertError } = await supabase.from('ball_by_ball_logs').insert({
    match_id: matchId,
    innings: match.current_innings,
    over_number: result.overNumber,
    ball_number: result.ballNumber,
    is_legal_delivery: result.isLegalDelivery,
    batsman_id: match.live_data.striker_id,
    bowler_id: match.live_data.bowler_id,
    runs_scored: input.extraType === 'none' || input.extraType === 'bye' || input.extraType === 'leg_bye'
      ? input.runsRun
      : 0, // runs "off the bat" is 0 for wide/no-ball by convention; byes/leg-byes are not off the bat either, but we store runsRun here for ball-by-ball reconstruction since the schema has one runs_scored column — extra_runs captures the extra-specific component for wides/no-balls
    extra_runs: input.extraRuns,
    extra_type: input.extraType,
    is_wicket: input.isWicket,
    wicket_type: input.isWicket ? input.wicketType ?? null : null,
    player_dismissed_id: input.isWicket ? input.playerDismissedId ?? null : null,
    fielder_id: input.fielderId ?? null,
    commentary: null,
  })

  if (insertError) {
    throw new Error(insertError.message)
  }

  // Determine if the innings/match transitions as a result of this ball.
  const updates: Partial<Omit<Match, 'id' | 'created_at'>> = { live_data: result.liveData }

  if (result.isInningsEnd) {
    if (match.current_innings === 1) {
      updates.innings1_score = result.liveData.score
      updates.innings1_wickets = result.liveData.wickets
      updates.innings1_overs = parseFloat(result.liveData.overs)
      updates.current_innings = 2
      updates.live_data = freshInningsLiveData(result.liveData.score + 1)
    } else {
      updates.status = 'completed'
    }
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath(`/admin/matches/${matchId}/score`)
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/admin')

  return {
    overJustCompleted: result.overJustCompleted,
    isInningsEnd: result.isInningsEnd,
    needsNewBatsman: input.isWicket && !result.isInningsEnd,
    needsNewBowler: result.overJustCompleted && !result.isInningsEnd,
  }
}

// ----------------------------------------------------------------
// Undo the most recent ball — deletes the last ball_by_ball_logs row
// for this innings and recomputes live_data by replaying every
// remaining ball from scratch. Replaying rather than trying to
// "reverse" a single ball avoids subtle bugs with reconstructing
// strike rotation / over-completion state by hand.
// ----------------------------------------------------------------
export async function undoLastBall(matchId: string) {
  await requireAdmin()
  const match = await getMatchOrThrow(matchId)
  const supabase = await createClient()

  const { data: lastBall } = await supabase
    .from('ball_by_ball_logs')
    .select('id')
    .eq('match_id', matchId)
    .eq('innings', match.current_innings)
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (!lastBall) {
    throw new Error('No balls to undo in this innings.')
  }

  const { error: deleteError } = await supabase
    .from('ball_by_ball_logs')
    .delete()
    .eq('id', lastBall.id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const { data: remainingBalls } = await supabase
    .from('ball_by_ball_logs')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings', match.current_innings)
    .order('id', { ascending: true })

  const battingSize = battingRoster(match).length

  let liveData = freshInningsLiveData(match.live_data.target)

  if (remainingBalls && remainingBalls.length > 0) {
    // Seed the very first ball's striker/non-striker/bowler from the
    // log: batsman_id on ball 1 is necessarily the opening striker,
    // and bowler_id is the opening bowler. We don't have the opening
    // non-striker recorded anywhere explicitly (only the striker who
    // faced each ball is logged) — but we CAN recover it once at
    // least one run has been scored that rotated strike, or once a
    // wicket fell and a replacement came in, by tracking every unique
    // batsman_id seen across the whole innings and the dismissal
    // log. For the common case (undo happens shortly after a
    // mis-click, not after dozens of balls), the cheaper and safer
    // approach is to track strike using the SAME batsman_id pattern
    // the log already encodes: each row's batsman_id IS the striker
    // at the time that ball was bowled, so the non-striker for that
    // ball is whichever of {current pair} isn't batsman_id. We
    // bootstrap the pair using the two earliest distinct batsman_ids
    // to appear before any rotation, which correctly recovers the
    // opening pair in the overwhelming majority of cases (anything
    // other than a wicket on ball 1 before a single run is scored).
    const distinctBatsmen: string[] = []
    for (const ball of remainingBalls) {
      if (!distinctBatsmen.includes(ball.batsman_id)) {
        distinctBatsmen.push(ball.batsman_id)
      }
      if (distinctBatsmen.length >= 2) break
    }

    liveData = {
      ...liveData,
      striker_id: remainingBalls[0].batsman_id,
      non_striker_id: distinctBatsmen.find((id) => id !== remainingBalls[0].batsman_id) ?? null,
      bowler_id: remainingBalls[0].bowler_id,
    }

    for (const ball of remainingBalls) {
      // Keep live_data's striker/bowler in sync with what the log
      // actually recorded for this ball, since computeNextLiveData
      // only rotates relative to whatever `current` already holds —
      // if our reconstructed pairing drifts from reality (e.g. after
      // a wicket we don't have enough info to know the replacement's
      // identity), forcing it back to the logged batsman_id/bowler_id
      // before applying the ball keeps the replay self-correcting.
      liveData = {
        ...liveData,
        striker_id: ball.batsman_id,
        bowler_id: ball.bowler_id,
      }

      const input: BallInput = {
        runsRun: ball.runs_scored,
        extraType: ball.extra_type,
        extraRuns: ball.extra_runs,
        isWicket: ball.is_wicket,
        wicketType: ball.wicket_type ?? undefined,
        playerDismissedId: ball.player_dismissed_id ?? undefined,
        fielderId: ball.fielder_id ?? undefined,
      }

      liveData = computeNextLiveData({
        current: liveData,
        input,
        totalOvers: match.total_overs,
        battingTeamRosterSize: battingSize,
        inningsNumber: match.current_innings,
        target: match.live_data.target,
      }).liveData
    }
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update({ live_data: liveData })
    .eq('id', matchId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath(`/admin/matches/${matchId}/score`)
  revalidatePath(`/matches/${matchId}`)
}

// ----------------------------------------------------------------
// Returns the IDs of batsmen already dismissed in the current
// innings, so the "select new batsman" UI can exclude them.
// ----------------------------------------------------------------
export async function getDismissedBatsmen(matchId: string, innings: 1 | 2) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ball_by_ball_logs')
    .select('player_dismissed_id')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('is_wicket', true)

  return (data ?? [])
    .map((row) => row.player_dismissed_id)
    .filter((id): id is string => id !== null)
}

// ----------------------------------------------------------------
// Returns the bowler_id of the most recently completed over in this
// innings, so the "select bowler" UI can exclude them — a bowler
// cannot bowl two overs in a row.
// ----------------------------------------------------------------
export async function getPreviousOverBowler(matchId: string, innings: 1 | 2) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ball_by_ball_logs')
    .select('bowler_id, over_number')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('is_legal_delivery', true)
    .order('id', { ascending: false })
    .limit(1)
    .single()

  return data?.bowler_id ?? null
}

// battingRoster/bowlingRoster are pure functions and live in
// @/lib/cricket/scoring instead of being re-exported here — a
// 'use server' file may only export async functions (every export
// becomes a server action reference), so a synchronous re-export here
// would fail the build. Import them directly from the cricket module
// wherever needed (e.g. the scoring console page).
