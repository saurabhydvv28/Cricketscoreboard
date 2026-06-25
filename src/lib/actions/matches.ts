'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth'
import { generate_player_id } from '@/lib/player-id'
import type { LiveMatchData } from '@/types/database'

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

// ----------------------------------------------------------------
// Search players — public read, uses anon client
// ----------------------------------------------------------------
export async function searchPlayers(query: string) {
  const supabase = await createClient()

  if (!query || query.trim().length < 1) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, player_id, avatar_url')
      .order('full_name', { ascending: true })
      .limit(30)
    return data ?? []
  }

  const term = query.trim()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, player_id, avatar_url')
    .or(`full_name.ilike.%${term}%,player_id.ilike.%${term}%`)
    .order('full_name', { ascending: true })
    .limit(30)

  return data ?? []
}

// ----------------------------------------------------------------
// Create a player profile (admin only, no auth required from player)
// ----------------------------------------------------------------
export interface CreatePlayerState {
  error: string | null
  success?: string | null
}

export async function createPlayer(
  _prevState: CreatePlayerState,
  formData: FormData
): Promise<CreatePlayerState> {
  try {
    await requireAdmin()
  } catch {
    return { error: 'Admin session expired. Please log in again.' }
  }

  const fullName = (formData.get('fullName') as string)?.trim()
  if (!fullName || fullName.length < 2) {
    return { error: "Enter the player's full name." }
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return {
      error:
        'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Add it to your Vercel Environment Variables and redeploy.',
    }
  }

  const playerId = generate_player_id(fullName)

  // Check for duplicate name
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', fullName)
    .limit(1)
    .single()

  if (existing) {
    return { error: `A player named "${fullName}" already exists.` }
  }

  const { error } = await supabase.from('profiles').insert({
    full_name: fullName,
    player_id: playerId,
    is_admin: false,
    avatar_url: null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/players')
  revalidatePath('/admin/players')
  return { error: null, success: `${fullName} added with Player ID: ${playerId}` }
}

// ----------------------------------------------------------------
// Delete a player profile (admin only)
// Returns error string on failure instead of throwing, so the client
// can display it rather than crashing the page.
// ----------------------------------------------------------------
export async function deletePlayer(playerId: string): Promise<string | null> {
  try {
    await requireAdmin()
  } catch {
    return 'Admin session expired. Please log in again.'
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel Environment Variables and redeploy.'
  }

  const { error } = await supabase.from('profiles').delete().eq('id', playerId)

  if (error) return error.message

  revalidatePath('/players')
  revalidatePath('/admin/players')
  return null
}

// ----------------------------------------------------------------
// Create a match
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

  if (!teamAName || teamAName.length < 2) fieldErrors.teamAName = 'Enter a team name.'
  if (!teamBName || teamBName.length < 2) fieldErrors.teamBName = 'Enter a team name.'
  if (teamAName && teamBName && teamAName.toLowerCase() === teamBName.toLowerCase())
    fieldErrors.teamBName = 'Team names must be different.'
  if (!totalOvers || totalOvers < 1 || totalOvers > 50)
    fieldErrors.totalOvers = 'Enter overs between 1 and 50.'
  if (teamARoster.length < 2) fieldErrors.teamARoster = 'Add at least 2 players.'
  if (teamBRoster.length < 2) fieldErrors.teamBRoster = 'Add at least 2 players.'
  if (teamARoster.filter((id) => teamBRoster.includes(id)).length > 0)
    fieldErrors.teamBRoster = 'A player cannot be on both teams.'

  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel Environment Variables and redeploy.' }
  }

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

  if (error || !match) return { error: error?.message ?? 'Failed to create match.' }

  revalidatePath('/admin')
  revalidatePath('/matches')
  redirect(`/admin/matches/${match.id}`)
}

// ----------------------------------------------------------------
// Start match (record toss + go live)
// ----------------------------------------------------------------
export async function startMatch(
  matchId: string,
  tossWinner: 'team_a' | 'team_b',
  tossDecision: 'bat' | 'bowl'
) {
  await requireAdmin()
  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to Vercel Environment Variables.')
  }
  const { error } = await supabase
    .from('matches')
    .update({ toss_winner: tossWinner, toss_decision: tossDecision, status: 'live' })
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin')
  revalidatePath('/matches')
  revalidatePath(`/admin/matches/${matchId}`)
  redirect(`/admin/matches/${matchId}/score`)
}

// ----------------------------------------------------------------
// Delete a scheduled match
// ----------------------------------------------------------------
export async function deleteMatch(matchId: string) {
  await requireAdmin()
  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return // silently fail if misconfigured - not worth crashing the admin dashboard
  }
  await supabase.from('matches').delete().eq('id', matchId).eq('status', 'scheduled')
  revalidatePath('/admin')
  revalidatePath('/matches')
}
