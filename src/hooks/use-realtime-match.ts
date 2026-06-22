'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BallByBallLog, Match } from '@/types/database'

export interface RealtimeMatchState {
  match: Match
  recentBalls: BallByBallLog[]
  isConnected: boolean
}

/**
 * Subscribes to Supabase Realtime for a single match. Receives the
 * initial server-rendered match data (avoiding a flash of empty
 * state) and merges in live updates as they arrive.
 *
 * Two Realtime channels are opened:
 *  1. `matches` row UPDATE filtered by id — gives us the new live_data
 *     JSONB (score, wickets, overs, striker etc.) on every ball.
 *  2. `ball_by_ball_logs` INSERT filtered by match_id — gives us each
 *     individual ball record for the "recent balls" commentary strip.
 *
 * The browser client (createClient) is used here, not the server
 * client — Realtime WebSocket connections must run client-side.
 */
export function useRealtimeMatch(
  initialMatch: Match,
  initialBalls: BallByBallLog[]
): RealtimeMatchState {
  const [match, setMatch] = useState<Match>(initialMatch)
  const [recentBalls, setRecentBalls] = useState<BallByBallLog[]>(initialBalls)
  const [isConnected, setIsConnected] = useState(false)

  // Keep a ref so subscription callbacks always close over the latest
  // match without needing to re-subscribe when it changes.
  const matchRef = useRef(match)
  matchRef.current = match

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`match:${initialMatch.id}`)
      // ── Channel 1: match row updates ──────────────────────────────
      // Every time the admin logs a ball, recordBall() does a
      // .update() on the matches row — this fires instantly.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${initialMatch.id}`,
        },
        (payload) => {
          const updated = payload.new as Match
          setMatch(updated)
        }
      )
      // ── Channel 2: new ball inserts ────────────────────────────────
      // Keeps the last-N-balls commentary strip fresh. We limit the
      // local list to the 12 most recent balls (enough for 2 full
      // overs) so the buffer doesn't grow unboundedly during a long
      // match.
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ball_by_ball_logs',
          filter: `match_id=eq.${initialMatch.id}`,
        },
        (payload) => {
          const newBall = payload.new as BallByBallLog
          setRecentBalls((prev) => {
            const updated = [newBall, ...prev]
            return updated.slice(0, 12)
          })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialMatch.id])

  return { match, recentBalls, isConnected }
}
