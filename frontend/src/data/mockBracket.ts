/**
 * Mock Tournament Bracket Data
 * Single-elimination bracket with 16 players, 4 rounds (QF, SF, F, Champion)
 */

export type MatchStatus = 'upcoming' | 'live' | 'completed'
export type BracketType = 'single-elimination' | 'double-elimination' | 'round-robin'

export interface BracketPlayer {
  id: string
  username: string
  avatar: string
  rating: number
  seed: number
}

export interface BracketMatch {
  id: string
  roundIndex: number
  matchIndex: number
  player1: BracketPlayer | null
  player2: BracketPlayer | null
  score1: number | null
  score2: number | null
  status: MatchStatus
  winnerId: string | null
  scheduledAt: string
  completedAt: string | null
}

export interface BracketRound {
  label: string
  matches: BracketMatch[]
}

export interface TournamentBracket {
  tournamentId: string
  bracketType: BracketType
  rounds: BracketRound[]
  champion: BracketPlayer | null
}

const mockPlayers: BracketPlayer[] = [
  { id: '1', username: '@ace_pilot', avatar: '⚡︎', rating: 2100, seed: 1 },
  { id: '2', username: '@neon_viper', avatar: '🐍', rating: 1850, seed: 16 },
  { id: '3', username: '@shadow_knight', avatar: '🗡️', rating: 2050, seed: 2 },
  { id: '4', username: '@crystal_sage', avatar: '✨', rating: 1750, seed: 15 },
  { id: '5', username: '@phoenix_rise', avatar: '🔥', rating: 1950, seed: 3 },
  { id: '6', username: '@steel_fist', avatar: '👊', rating: 1700, seed: 14 },
  { id: '7', username: '@echo_void', avatar: '👁️', rating: 1900, seed: 4 },
  { id: '8', username: '@storm_caller', avatar: '⛈️', rating: 1650, seed: 13 },
  { id: '9', username: '@titan_force', avatar: '💪', rating: 1880, seed: 5 },
  { id: '10', username: '@lunar_dance', avatar: '🌙', rating: 1620, seed: 12 },
  { id: '11', username: '@inferno_blaze', avatar: '🌋', rating: 1820, seed: 6 },
  { id: '12', username: '@frost_bite', avatar: '❄️', rating: 1580, seed: 11 },
  { id: '13', username: '@cosmic_burst', avatar: '💫', rating: 1760, seed: 7 },
  { id: '14', username: '@shadow_strike', avatar: '💀', rating: 1550, seed: 10 },
  { id: '15', username: '@velocity_rush', avatar: '💨', rating: 1700, seed: 8 },
  { id: '16', username: '@void_walker', avatar: '👻', rating: 1520, seed: 9 },
]

export const mockBracket: TournamentBracket = {
  tournamentId: '1',
  bracketType: 'single-elimination',
  rounds: [
    {
      label: 'QUARTER-FINALS',
      matches: [
        {
          id: 'qf-1',
          roundIndex: 0,
          matchIndex: 0,
          player1: mockPlayers[0],
          player2: mockPlayers[1],
          score1: 3,
          score2: 1,
          status: 'completed',
          winnerId: '1',
          scheduledAt: '2026-02-07T14:00:00Z',
          completedAt: '2026-02-07T14:45:00Z',
        },
        {
          id: 'qf-2',
          roundIndex: 0,
          matchIndex: 1,
          player1: mockPlayers[2],
          player2: mockPlayers[3],
          score1: 2,
          score2: 0,
          status: 'completed',
          winnerId: '3',
          scheduledAt: '2026-02-07T15:00:00Z',
          completedAt: '2026-02-07T15:35:00Z',
        },
        {
          id: 'qf-3',
          roundIndex: 0,
          matchIndex: 2,
          player1: mockPlayers[4],
          player2: mockPlayers[5],
          score1: 3,
          score2: 2,
          status: 'completed',
          winnerId: '5',
          scheduledAt: '2026-02-07T16:00:00Z',
          completedAt: '2026-02-07T16:52:00Z',
        },
        {
          id: 'qf-4',
          roundIndex: 0,
          matchIndex: 3,
          player1: mockPlayers[6],
          player2: mockPlayers[7],
          score1: 2,
          score2: 1,
          status: 'completed',
          winnerId: '7',
          scheduledAt: '2026-02-07T16:30:00Z',
          completedAt: '2026-02-07T17:18:00Z',
        },
        {
          id: 'qf-5',
          roundIndex: 0,
          matchIndex: 4,
          player1: mockPlayers[8],
          player2: mockPlayers[9],
          score1: 2,
          score2: 0,
          status: 'live',
          winnerId: null,
          scheduledAt: '2026-02-07T17:00:00Z',
          completedAt: null,
        },
        {
          id: 'qf-6',
          roundIndex: 0,
          matchIndex: 5,
          player1: mockPlayers[10],
          player2: mockPlayers[11],
          score1: 1,
          score2: 1,
          status: 'live',
          winnerId: null,
          scheduledAt: '2026-02-07T17:30:00Z',
          completedAt: null,
        },
        {
          id: 'qf-7',
          roundIndex: 0,
          matchIndex: 6,
          player1: mockPlayers[12],
          player2: mockPlayers[13],
          score1: null,
          score2: null,
          status: 'upcoming',
          winnerId: null,
          scheduledAt: '2026-02-08T14:00:00Z',
          completedAt: null,
        },
        {
          id: 'qf-8',
          roundIndex: 0,
          matchIndex: 7,
          player1: mockPlayers[14],
          player2: mockPlayers[15],
          score1: null,
          score2: null,
          status: 'upcoming',
          winnerId: null,
          scheduledAt: '2026-02-08T15:00:00Z',
          completedAt: null,
        },
      ],
    },
    {
      label: 'SEMI-FINALS',
      matches: [
        {
          id: 'sf-1',
          roundIndex: 1,
          matchIndex: 0,
          player1: mockPlayers[0], // Winner of QF-1
          player2: mockPlayers[2], // Winner of QF-2
          score1: 2,
          score2: 1,
          status: 'completed',
          winnerId: '1',
          scheduledAt: '2026-02-08T16:00:00Z',
          completedAt: '2026-02-08T16:42:00Z',
        },
        {
          id: 'sf-2',
          roundIndex: 1,
          matchIndex: 1,
          player1: mockPlayers[4], // Winner of QF-3
          player2: mockPlayers[6], // Winner of QF-4
          score1: null,
          score2: null,
          status: 'upcoming',
          winnerId: null,
          scheduledAt: '2026-02-09T14:00:00Z',
          completedAt: null,
        },
      ],
    },
    {
      label: 'FINALS',
      matches: [
        {
          id: 'f-1',
          roundIndex: 2,
          matchIndex: 0,
          player1: mockPlayers[0], // Winner of SF-1
          player2: null, // TBD - waiting for SF-2 winner
          score1: null,
          score2: null,
          status: 'upcoming',
          winnerId: null,
          scheduledAt: '2026-02-09T18:00:00Z',
          completedAt: null,
        },
      ],
    },
  ],
  champion: null,
}

export function getMockBracket(tournamentId: string): TournamentBracket {
  return mockBracket
}

export function getMatchById(bracket: TournamentBracket, matchId: string): BracketMatch | undefined {
  for (const round of bracket.rounds) {
    const match = round.matches.find(m => m.id === matchId)
    if (match) return match
  }
  return undefined
}

export function getWinnerOfMatch(match: BracketMatch): BracketPlayer | null {
  if (match.winnerId === match.player1?.id) return match.player1
  if (match.winnerId === match.player2?.id) return match.player2
  return null
}
