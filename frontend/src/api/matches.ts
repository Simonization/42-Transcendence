/**
 * Matches API
 * Endpoints for match history
 */

import { api } from './index'
import type { BackendMatch, Match, MatchStats, MatchResult } from '../types'

const RESULT_MAP: Record<string, MatchResult> = {
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw',
}

/**
 * Transform a backend match into a frontend match
 * Extracts opponent from userMatches and maps enum values
 */
export function transformMatch(raw: BackendMatch, currentUserId: number): Match | null {
  const myEntry = raw.userMatches?.find(um => um.user_id === currentUserId)
  if (!myEntry || myEntry.result === 'PENDING') return null

  const opponentEntry = raw.userMatches.find(um => um.user_id !== currentUserId)

  return {
    id: raw.id,
    opponent: opponentEntry?.user?.username ?? 'Unknown',
    game: raw.game?.name ?? 'Unknown',
    result: RESULT_MAP[myEntry.result],
    date: raw.created_at,
  }
}

/**
 * Compute win/loss/draw stats from a list of matches
 */
export function computeStats(matches: Match[]): MatchStats {
  const wins = matches.filter(m => m.result === 'win').length
  const losses = matches.filter(m => m.result === 'loss').length
  const draws = matches.filter(m => m.result === 'draw').length
  const total = matches.length

  return {
    wins,
    losses,
    draws,
    totalMatches: total,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  }
}

export const matchesApi = {
  /**
   * Get the current user's match history
   */
  getMyHistory(): Promise<BackendMatch[]> {
    return api<BackendMatch[]>('/matches/my-history')
  },

  /**
   * Get match history for a specific player
   */
  getPlayerHistory(userId: number): Promise<BackendMatch[]> {
    return api<BackendMatch[]>(`/matches/history/${userId}`)
  },

  /**
   * Get a single match by ID
   */
  getMatch(id: number): Promise<BackendMatch> {
    return api<BackendMatch>(`/matches/${id}`)
  },
}
