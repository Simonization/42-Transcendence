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

/** A team slot as the history endpoint returns it: with its members, to find "my" side. */
export interface BackendHistoryTeam {
  id: number
  name: string
  members?: { id: number; username: string }[]
}

export interface BackendMatch {
  id: number
  game?: { id: number; name: string } | null
  created_at: string
  /** Legacy per-player rows; tournament matches use the team slots instead. */
  userMatches: BackendUserMatch[]
  details?: Record<string, unknown>
  status?: string
  team1?: BackendHistoryTeam | null
  team2?: BackendHistoryTeam | null
  team1_score?: number | null
  team2_score?: number | null
  winner_id?: number | null
  finished_at?: string | null
  game_data?: Record<string, unknown> | null
  phase?: {
    game?: { id: number; name: string } | null
    tournament?: { id: number; name: string } | null
  } | null
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
  /** "3 - 1" from my side, or null (walkover, legacy match). */
  score?: string | null
  tournament?: string | null
}

export interface MatchStats {
  wins: number
  losses: number
  draws: number
  totalMatches: number
  winRate: number
}
