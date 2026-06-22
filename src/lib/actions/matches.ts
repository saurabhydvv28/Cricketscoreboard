'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { LiveMatchData } from '@/types/database'

export interface CreateMatchFormState {
  error: string | null
  fieldErrors?: {
    teamAName?: string
    teamBName?: string
    totalOvers?: string
    teamARoster?: string
    teamBRoster?: string
  }
}

const initialLiveData: LiveMatchData = {
  striker_id: null,
  non_striker_id: null,
  bowler_id: null,
  score: 0,
  wickets: 0,
  overs: '0.0',
  legal_balls_in_over: 0,
  run_rate: 0,
  required_run_rate: null,
  target: null,
  current_over_balls: [],
}

// ----------------------------------------------------------------
// Verify the current user is an admin. Used at the top of every
// admin server action — RLS also enforces this at the DB layer via
// is_admin(), but checking here lets us return a friendly form error
// instead of a raw Postgres permission-denied message.
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

// ----------------------------------------------------------------
// Search players by full_name or player_id for roster assembly.
// Returns a small result set for the admin's autocomplete UI.
// ----------------------------------------------------------------
export async function searchPlayers(query: string) {
  const supabase = await createClient()

  if (!query || query.trim().length < 1) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, player_id, avatar_url')
      .order('full_name', { ascending: true })
      .limit(20)
    return data ?? []
  }

  const term = query.trim()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, player_id, avatar_url')
    .or(`full_name.ilike.%${term}%,player_id.ilike.%${term}%`)
    .order('full_name', { ascending: true })
    .limit(20)

  return data ?? []
}

// ----------------------------------------------------------------
// Create a new match with two rosters. Validates team names, overs,
// minimum roster size, and that no player appears on both teams.
// ----------------------------------------------------------------
export async function createMatch(
  _prevState: CreateMatchFormState,
  formData: FormData
): Promise<CreateMatchFormState> {
  await requireAdmin()

  const teamAName = (formData.get('teamAName') as string)?.trim()
  const teamBName = (formData.get('teamBName') as string)?.trim()
  const totalOversRaw = formData.get('totalOvers') as string
  const totalOvers = parseInt(totalOversRaw, 10)
  const teamARoster = formData.getAll('teamARoster') as string[]
  const teamBRoster = formData.getAll('teamBRoster') as string[]

  const fieldErrors: CreateMatchFormState['fieldErrors'] = {}

  if (!teamAName || teamAName.length < 2) {
    fieldErrors.teamAName = 'Enter a team name.'
  }
  if (!teamBName || teamBName.length < 2) {
    fieldErrors.teamBName = 'Enter a team name.'
  }
  if (teamAName && teamBName && teamAName.toLowerCase() === teamBName.toLowerCase()) {
    fieldErrors.teamBName = 'Team names must be different.'
  }
  if (!totalOvers || totalOvers < 1 || totalOvers > 50) {
    fieldErrors.totalOvers = 'Enter overs between 1 and 50.'
  }
  if (teamARoster.length < 2) {
    fieldErrors.teamARoster = 'Add at least 2 players.'
  }
  if (teamBRoster.length < 2) {
    fieldErrors.teamBRoster = 'Add at least 2 players.'
  }
  const overlap = teamARoster.filter((id) => teamBRoster.includes(id))
  if (overlap.length > 0) {
    fieldErrors.teamBRoster = 'A player cannot be on both teams.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors }
  }

  const supabase = await createClient()

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      team_a_name: teamAName,
      team_b_name: teamBName,
      team_a_roster: teamARoster,
      team_b_roster: teamBRoster,
      status: 'scheduled',
      total_overs: totalOvers,
      toss_winner: null,
      toss_decision: null,
      current_innings: 1,
      innings1_score: null,
      innings1_wickets: null,
      innings1_overs: null,
      live_data: initialLiveData,
    })
    .select('id')
    .single()

  if (error || !match) {
    return { error: error?.message ?? 'Failed to create match.' }
  }

  revalidatePath('/admin')
  revalidatePath('/matches')
  redirect(`/admin/matches/${match.id}`)
}

// ----------------------------------------------------------------
// Set the toss result and move a scheduled match to live. This is a
// separate action from createMatch so the admin can create the match
// ahead of time and start it later, right before play begins.
// ----------------------------------------------------------------
export async function startMatch(
  matchId: string,
  tossWinner: 'team_a' | 'team_b',
  tossDecision: 'bat' | 'bowl'
) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update({
      toss_winner: tossWinner,
      toss_decision: tossDecision,
      status: 'live',
    })
    .eq('id', matchId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/matches')
  revalidatePath(`/admin/matches/${matchId}`)
  redirect(`/admin/matches/${matchId}/score`)
}

// ----------------------------------------------------------------
// Delete a scheduled match (admin changed their mind before it went
// live). Matches that are live or completed should not be deletable
// from the UI to protect historical data and in-progress games.
// ----------------------------------------------------------------
export async function deleteMatch(matchId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
    .eq('status', 'scheduled')

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/matches')
}
