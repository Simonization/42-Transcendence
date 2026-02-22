/**
 * Match Types
 * Backend and frontend shapes for match history data
 */

// --- Backend shapes (raw API response) ---

export interface BackendUserMatch {
  userId: number
  result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING'
  user: {
    id: number
    username: string
  }
}

export interface BackendMatch {
  id: number
  game_type: number
  created_at: string
  userMatches: BackendUserMatch[]
  details?: Record<string, unknown>
}

// --- Frontend shapes ---

export type GameType = 'Chess' | 'League of Legends' | 'Unknown'
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
