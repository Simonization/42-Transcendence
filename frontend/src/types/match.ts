/**
 * Match Types
 * Backend and frontend shapes for match history data
 */

// --- Backend shapes (raw API response) ---

export interface BackendUserMatch {
  user_id: number
  result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING'
  user: {
    id: number
    username: string
  }
}

export interface BackendMatch {
  id: number
  game?: { id: number; name: string } | null
  created_at: string
  userMatches: BackendUserMatch[]
  details?: Record<string, unknown>
}

// --- Frontend shapes ---

/** Games are admin-created rows, so the set is open-ended. */
export type GameType = string
export type MatchResult = 'win' | 'loss' | 'draw'

export interface Match {
  id: number
  opponent: string
  game: GameType
  result: MatchResult
  date: string
}

export interface MatchStats {
  wins: number
  losses: number
  draws: number
  totalMatches: number
  winRate: number
}
