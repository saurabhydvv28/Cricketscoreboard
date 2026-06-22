// ============================================================
// Pure cricket scoring logic. No Supabase, no I/O — every function
// here takes the current state and a ball event and returns the next
// state. Keeping this pure makes the rules easy to reason about (and
// test) independently of the server action / UI that calls it.
// ============================================================

import type { BallSummary, ExtraType, LiveMatchData, Match, WicketType } from '@/types/database'

export type BallInput = {
  // Runs physically run between the wickets. For a normal delivery
  // this is runs off the bat. For byes/leg-byes it's the runs run
  // (the ball missed the bat, but the batsmen still ran). For a
  // wide/no-ball with no run attempted, this is 0. Keeping a single
  // "runs run" field — rather than separate "runs off bat" vs "byes
  // run" fields — means ONE odd/even check correctly drives strike
  // rotation for every delivery type.
  runsRun: number
  extraType: ExtraType
  extraRuns: number // additional runs awarded purely for the extra itself (e.g. the mandatory 1 for a wide/no-ball, or the bye/leg-bye count)
  isWicket: boolean
  wicketType?: WicketType
  playerDismissedId?: string // striker or non-striker, for run-outs where either end's batsman might be out
  fielderId?: string
}

export type BallComputationResult = {
  liveData: LiveMatchData
  isLegalDelivery: boolean
  overNumber: number // 0-indexed, the over this ball belongs to
  ballNumber: number // 1-6 for legal deliveries; for illegal deliveries this is the legal-ball count already completed in the over (the illegal ball doesn't consume a slot)
  overJustCompleted: boolean // true if this ball was the 6th legal ball of the over
  isInningsEnd: boolean // true if this ball ends the innings (all out / overs complete / target chased)
}

/** A delivery counts toward the 6-ball over unless it's a wide or no-ball. */
export function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType !== 'wide' && extraType !== 'no_ball'
}

/** Total runs added to the team score for this delivery. */
export function totalRunsForBall(input: BallInput): number {
  return input.runsRun + input.extraRuns
}

/**
 * Whether the strike should rotate to the other batsman purely from
 * runs run on this ball (end-of-over rotation is handled separately
 * by the caller, since it's unconditional regardless of the run
 * count on the final ball).
 */
export function shouldRotateStrike(input: BallInput): boolean {
  if (input.isWicket && input.wicketType !== 'run_out') {
    // Batsman given out other than run-out — no run was actually
    // completed on this delivery, so no rotation from runs.
    return false
  }
  return input.runsRun % 2 === 1
}

/** Cricket's "overs.balls" display, e.g. 17 legal balls = "2.5". */
export function formatOvers(legalBallsTotal: number): string {
  const overs = Math.floor(legalBallsTotal / 6)
  const balls = legalBallsTotal % 6
  return `${overs}.${balls}`
}

/** Parses the "overs.balls" display string back into a total legal-ball count. */
export function parseOversToLegalBalls(oversDisplay: string): number {
  const [oversPart, ballsPart] = oversDisplay.split('.')
  const overs = parseInt(oversPart, 10) || 0
  const balls = parseInt(ballsPart, 10) || 0
  return overs * 6 + balls
}

/** Short display label for a ball, used in the "this over" dot row. */
export function ballLabel(input: BallInput): string {
  if (input.isWicket) return 'W'
  if (input.extraType === 'wide') {
    return input.extraRuns > 1 ? `wd+${input.extraRuns - 1}` : 'wd'
  }
  if (input.extraType === 'no_ball') {
    return input.runsRun > 0 ? `nb+${input.runsRun}` : 'nb'
  }
  if (input.extraType === 'bye') {
    return `${input.extraRuns}b`
  }
  if (input.extraType === 'leg_bye') {
    return `${input.extraRuns}lb`
  }
  return String(input.runsRun)
}

interface ComputeBallParams {
  current: LiveMatchData
  input: BallInput
  totalOvers: number
  battingTeamRosterSize: number
  inningsNumber: 1 | 2
  target: number | null // only relevant for innings 2
}

/**
 * The core scoring transition: given the current live_data and a new
 * ball event, compute the next live_data state. Does NOT touch the
 * database — the caller (server action) is responsible for inserting
 * the ball_by_ball_logs row and persisting the returned live_data.
 */
export function computeNextLiveData({
  current,
  input,
  totalOvers,
  battingTeamRosterSize,
  inningsNumber,
  target,
}: ComputeBallParams): BallComputationResult {
  const legal = isLegalDelivery(input.extraType)
  const runsThisBall = totalRunsForBall(input)

  const legalBallsSoFar = parseOversToLegalBalls(current.overs)
  const overNumber = Math.floor(legalBallsSoFar / 6)
  const ballNumber = legal ? current.legal_balls_in_over + 1 : current.legal_balls_in_over

  const newScore = current.score + runsThisBall
  const newWickets = current.wickets + (input.isWicket ? 1 : 0)

  const newLegalBallsInOver = legal ? current.legal_balls_in_over + 1 : current.legal_balls_in_over
  const overJustCompleted = legal && newLegalBallsInOver === 6

  const newLegalBallsTotal = legalBallsSoFar + (legal ? 1 : 0)
  const newOversDisplay = formatOvers(newLegalBallsTotal)

  const ballsRemainingInInnings = totalOvers * 6 - newLegalBallsTotal
  const isAllOut = newWickets >= battingTeamRosterSize - 1
  const isOversComplete = ballsRemainingInInnings <= 0
  const isTargetChased = inningsNumber === 2 && target !== null && newScore >= target
  const isInningsEnd = isAllOut || isOversComplete || isTargetChased

  // Strike rotation: odd runs run rotate strike; end-of-over always
  // rotates strike regardless of the run count on the final ball.
  let striker = current.striker_id
  let nonStriker = current.non_striker_id
  if (shouldRotateStrike(input)) {
    ;[striker, nonStriker] = [nonStriker, striker]
  }
  if (overJustCompleted) {
    ;[striker, nonStriker] = [nonStriker, striker]
  }

  // On a wicket, the dismissed batsman's slot is cleared so the UI is
  // forced to prompt for the next batsman before another ball can be
  // logged. This check runs AFTER strike rotation above, which is
  // intentional and matters specifically for run-outs: if N runs were
  // completed before the run-out, the batsmen have already crossed N
  // times, so the player physically standing at "the striker's end"
  // when given out may not be whoever started the ball as striker.
  // `playerDismissedId` is checked against the POST-rotation
  // striker/non_striker, which correctly identifies which end's slot
  // to clear based on where that player actually ended up standing —
  // not which named role (striker/non-striker) they held at the start
  // of the ball. Verified by hand-tracing: A=striker, B=non-striker,
  // 1 run completed then B run out -> rotation swaps to striker=B,
  // non_striker=A -> B matches the (rotated) striker slot -> clears
  // striker, leaving A correctly as non-striker. This matches physical
  // reality even though it looks surprising on first read.
  if (input.isWicket) {
    if (input.playerDismissedId === striker) {
      striker = null
    } else if (input.playerDismissedId === nonStriker) {
      nonStriker = null
    }
  }

  // Bowler figures reset at the end of the over — the UI must prompt
  // for a new bowler (who cannot be the same as the previous over's).
  const newBowlerId = overJustCompleted ? null : current.bowler_id

  const oversCompletedFloat = newLegalBallsTotal / 6
  const runRate = oversCompletedFloat > 0 ? newScore / oversCompletedFloat : 0

  let requiredRunRate: number | null = null
  if (inningsNumber === 2 && target !== null && !isInningsEnd) {
    const runsNeeded = target - newScore
    const oversLeft = ballsRemainingInInnings / 6
    requiredRunRate = oversLeft > 0 ? Math.max(runsNeeded, 0) / oversLeft : 0
  }

  const newBallSummary: BallSummary = {
    runs: runsThisBall,
    extra_type: input.extraType === 'none' ? null : input.extraType,
    is_wicket: input.isWicket,
    label: ballLabel(input),
  }

  // `current.legal_balls_in_over === 0` unambiguously means "no legal
  // ball has been bowled yet in the over currently in progress" — true
  // both at the very start of an innings AND immediately after the
  // previous ball completed an over (since that reset it to 0). So the
  // display row always starts fresh exactly when it should, with no
  // separate "was the last ball an over-completor" flag needed.
  const startingFreshOver = current.legal_balls_in_over === 0
  const displayOverBalls = startingFreshOver
    ? [newBallSummary]
    : [...current.current_over_balls, newBallSummary]

  const nextLiveData: LiveMatchData = {
    striker_id: isInningsEnd ? null : striker,
    non_striker_id: isInningsEnd ? null : nonStriker,
    bowler_id: isInningsEnd ? null : newBowlerId,
    score: newScore,
    wickets: newWickets,
    overs: newOversDisplay,
    legal_balls_in_over: overJustCompleted ? 0 : newLegalBallsInOver,
    run_rate: Math.round(runRate * 100) / 100,
    required_run_rate: requiredRunRate !== null ? Math.round(requiredRunRate * 100) / 100 : null,
    target,
    current_over_balls: displayOverBalls,
  }

  return {
    liveData: nextLiveData,
    isLegalDelivery: legal,
    overNumber,
    ballNumber,
    overJustCompleted,
    isInningsEnd,
  }
}

/**
 * Determines which team is batting in the given innings of a match,
 * based on the toss result, and returns that team's roster. Innings
 * 2 is always the other team from innings 1.
 */
export function battingRoster(match: Pick<Match, 'toss_winner' | 'toss_decision' | 'current_innings' | 'team_a_roster' | 'team_b_roster'>): string[] {
  const teamABatsInInningsOne =
    (match.toss_winner === 'team_a' && match.toss_decision === 'bat') ||
    (match.toss_winner === 'team_b' && match.toss_decision === 'bowl')

  const battingIsTeamA =
    match.current_innings === 1 ? teamABatsInInningsOne : !teamABatsInInningsOne

  return battingIsTeamA ? match.team_a_roster : match.team_b_roster
}

/** The complement of battingRoster — whichever roster isn't currently batting. */
export function bowlingRoster(match: Pick<Match, 'toss_winner' | 'toss_decision' | 'current_innings' | 'team_a_roster' | 'team_b_roster'>): string[] {
  const batting = battingRoster(match)
  return batting === match.team_a_roster ? match.team_b_roster : match.team_a_roster
}

/**
 * Builds the fresh live_data for the start of an innings (either the
 * 1st innings of a match, or the 2nd innings after the 1st has ended).
 */
export function freshInningsLiveData(target: number | null): LiveMatchData {
  return {
    striker_id: null,
    non_striker_id: null,
    bowler_id: null,
    score: 0,
    wickets: 0,
    overs: '0.0',
    legal_balls_in_over: 0,
    run_rate: 0,
    required_run_rate: null,
    target,
    current_over_balls: [],
  }
}
