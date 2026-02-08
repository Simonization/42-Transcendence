/**
 * Mock Match History Data
 * Simulates Chess.com API responses for match history
 */

export type GameType = 'Chess' | 'League of Legends' | 'Counter-Strike' | 'Valorant' | 'Dota 2'
export type MatchResult = 'win' | 'loss' | 'draw'

export interface Match {
  id: string
  opponent: string
  game: GameType
  result: MatchResult
  date: string
  ratingChange: number
  yourRating: number
  opponentRating: number
  duration: number // in minutes
}

export interface MatchHistoryStats {
  wins: number
  losses: number
  draws: number
  totalMatches: number
  winRate: number
  currentRating: number
  highestRating: number
  lowestRating: number
  averageOpponentRating: number
}

export const mockMatches: Match[] = [
  {
    id: '1',
    opponent: '@master_player',
    game: 'Chess',
    result: 'win',
    date: '2026-02-07',
    ratingChange: +15,
    yourRating: 1650,
    opponentRating: 1620,
    duration: 8,
  },
  {
    id: '2',
    opponent: '@grandmaster_pro',
    game: 'Chess',
    result: 'loss',
    date: '2026-02-06',
    ratingChange: -8,
    yourRating: 1635,
    opponentRating: 1780,
    duration: 12,
  },
  {
    id: '3',
    opponent: '@chess_legend',
    game: 'Chess',
    result: 'win',
    date: '2026-02-05',
    ratingChange: +12,
    yourRating: 1643,
    opponentRating: 1580,
    duration: 15,
  },
  {
    id: '4',
    opponent: '@tactical_player',
    game: 'Valorant',
    result: 'win',
    date: '2026-02-04',
    ratingChange: +25,
    yourRating: 2150,
    opponentRating: 2100,
    duration: 35,
  },
  {
    id: '5',
    opponent: '@immortal_rank',
    game: 'Valorant',
    result: 'loss',
    date: '2026-02-03',
    ratingChange: -18,
    yourRating: 2125,
    opponentRating: 2280,
    duration: 28,
  },
  {
    id: '6',
    opponent: '@esports_pro',
    game: 'League of Legends',
    result: 'win',
    date: '2026-02-02',
    ratingChange: +32,
    yourRating: 1850,
    opponentRating: 1800,
    duration: 42,
  },
  {
    id: '7',
    opponent: '@challenger_player',
    game: 'League of Legends',
    result: 'loss',
    date: '2026-02-01',
    ratingChange: -22,
    yourRating: 1818,
    opponentRating: 1950,
    duration: 38,
  },
  {
    id: '8',
    opponent: '@counter_strike_king',
    game: 'Counter-Strike',
    result: 'win',
    date: '2026-01-31',
    ratingChange: +18,
    yourRating: 2750,
    opponentRating: 2680,
    duration: 45,
  },
  {
    id: '9',
    opponent: '@dota_master',
    game: 'Dota 2',
    result: 'draw',
    date: '2026-01-30',
    ratingChange: 0,
    yourRating: 4250,
    opponentRating: 4200,
    duration: 55,
  },
  {
    id: '10',
    opponent: '@chess_warrior',
    game: 'Chess',
    result: 'win',
    date: '2026-01-29',
    ratingChange: +10,
    yourRating: 1631,
    opponentRating: 1550,
    duration: 22,
  },
]

export const mockStats: MatchHistoryStats = {
  wins: 6,
  losses: 3,
  draws: 1,
  totalMatches: 10,
  winRate: 60,
  currentRating: 1650,
  highestRating: 2750,
  lowestRating: 1550,
  averageOpponentRating: 1698,
}

/**
 * Get all matches
 */
export function getAllMatches(): Match[] {
  return mockMatches
}

/**
 * Get matches by game
 */
export function getMatchesByGame(game: GameType): Match[] {
  return mockMatches.filter(m => m.game === game)
}

/**
 * Get matches by result
 */
export function getMatchesByResult(result: MatchResult): Match[] {
  return mockMatches.filter(m => m.result === result)
}

/**
 * Get paginated matches
 */
export function getPaginatedMatches(page: number, pageSize: number = 10): Match[] {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return mockMatches.slice(start, end)
}

/**
 * Get stats
 */
export function getMatchStats(): MatchHistoryStats {
  return mockStats
}
