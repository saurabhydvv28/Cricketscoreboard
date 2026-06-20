// ============================================================
// Database types — mirrors the Supabase PostgreSQL schema
//
// IMPORTANT: all row shapes below use `type` (not `interface`).
// supabase-js 2.108.x's GenericTable constraint requires structural
// assignability to Record<string, unknown>, which `interface`
// declarations do NOT satisfy in this TS version (interfaces lack an
// implicit index signature, even when all properties are present).
// Using `interface` here silently breaks ALL query type inference —
// every `.from(...).select(...)` result collapses to `never` with no
// compile error pointing at the actual cause. Keep these as `type`.
// ============================================================

export type MatchStatus = 'scheduled' | 'live' | 'completed'
export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'none'
export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'obstructing_field'
  | 'timed_out'
  | 'handled_ball'

// ---- live_data JSONB shape stored in matches.live_data ----
export type BallSummary = {
  runs: number
  extra_type: ExtraType | null
  is_wicket: boolean
  label: string // e.g. "4", "W", "wd", "nb+1"
}

export type LiveMatchData = {
  striker_id: string | null
  non_striker_id: string | null
  bowler_id: string | null
  score: number
  wickets: number
  overs: string         // display format e.g. "5.4"
  legal_balls_in_over: number // 0-5, resets each over
  run_rate: number
  required_run_rate: number | null
  target: number | null
  current_over_balls: BallSummary[]
}

// ---- Table row types ----
export type Profile = {
  id: string
  full_name: string
  player_id: string   // human-readable slug
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export type Match = {
  id: string
  team_a_name: string
  team_b_name: string
  team_a_roster: string[]
  team_b_roster: string[]
  status: MatchStatus
  total_overs: number
  toss_winner: 'team_a' | 'team_b' | null
  toss_decision: 'bat' | 'bowl' | null
  current_innings: 1 | 2
  innings1_score: number | null
  innings1_wickets: number | null
  innings1_overs: number | null
  live_data: LiveMatchData
  created_at: string
  updated_at: string
}

export type BallByBallLog = {
  id: number
  match_id: string
  innings: 1 | 2
  over_number: number
  ball_number: number
  is_legal_delivery: boolean
  batsman_id: string
  bowler_id: string
  runs_scored: number
  extra_runs: number
  extra_type: ExtraType
  is_wicket: boolean
  wicket_type: WicketType | null
  player_dismissed_id: string | null
  fielder_id: string | null
  commentary: string | null
  created_at: string
}

// ---- View types for leaderboards ----
export type BattingStatsRow = {
  player_id: string
  full_name: string
  player_slug: string
  avatar_url: string | null
  total_runs: number
  balls_faced: number
  fours: number
  sixes: number
  matches_played: number
  strike_rate: number
}

export type BowlingStatsRow = {
  player_id: string
  full_name: string
  player_slug: string
  avatar_url: string | null
  matches_played: number
  legal_balls: number
  full_overs: number
  remaining_balls: number
  wickets: number
  runs_conceded: number
  economy_rate: number | null
}

export type OrangeCapRow = BattingStatsRow & {
  rank: number
}

export type PurpleCapRow = BowlingStatsRow & {
  rank: number
}

export type StrikeRateLeaderRow = {
  rank: number
  player_id: string
  full_name: string
  player_slug: string
  avatar_url: string | null
  total_runs: number
  balls_faced: number
  matches_played: number
  strike_rate: number
}

export type EconomyRateLeaderRow = {
  rank: number
  player_id: string
  full_name: string
  player_slug: string
  avatar_url: string | null
  wickets: number
  runs_conceded: number
  full_overs: number
  remaining_balls: number
  matches_played: number
  economy_rate: number
}

// ---- Supabase DB schema type (for typed client) ----
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Match, 'id' | 'created_at'>>
        Relationships: []
      }
      ball_by_ball_logs: {
        Row: BallByBallLog
        Insert: Omit<BallByBallLog, 'id' | 'created_at'>
        Update: Partial<Omit<BallByBallLog, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      v_batting_stats: { Row: BattingStatsRow; Relationships: [] }
      v_bowling_stats: { Row: BowlingStatsRow; Relationships: [] }
      v_leaderboard_orange_cap: { Row: OrangeCapRow; Relationships: [] }
      v_leaderboard_purple_cap: { Row: PurpleCapRow; Relationships: [] }
      v_leaderboard_strike_rate: { Row: StrikeRateLeaderRow; Relationships: [] }
      v_leaderboard_economy_rate: { Row: EconomyRateLeaderRow; Relationships: [] }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      match_status: MatchStatus
      extra_type: ExtraType
      wicket_type: WicketType
    }
    CompositeTypes: Record<string, never>
  }
}
