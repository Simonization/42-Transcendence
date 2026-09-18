/**
 * Builds the bracket view-model from a tournament.
 *
 * Two sources, in priority order:
 *  - persisted matches, once an admin has started the tournament;
 *  - otherwise a provisional bracket seeded from the registered teams, so a team shows up the
 *    moment it registers instead of the page sitting empty until the tournament starts.
 */

import { PhaseType, TeamStatus } from '../types'
import type {
  BackendMatch,
  BackendTeam,
  BackendTournament,
  BracketMatch,
  BracketPlayer,
  BracketRound,
  BracketType,
  MatchStatus,
  TournamentBracket,
} from '../types'

const BYE: BracketPlayer = {
  id: 'bye',
  username: 'BYE',
  avatar: '—',
  rating: 0,
  seed: 0,
}

export const isBye = (p: BracketPlayer | null): boolean => p?.id === BYE.id

function bracketTypeOf(type: PhaseType | undefined): BracketType {
  if (type === PhaseType.DOUBLE_ELIMINATION) return 'double-elimination'
  if (type === PhaseType.ROUND_ROBIN) return 'round-robin'
  return 'single-elimination'
}

function toPlayer(team: BackendTeam, seed: number): BracketPlayer {
  return {
    id: String(team.id),
    username: team.name,
    avatar: team.name.charAt(0).toUpperCase(),
    rating: team.members?.length ?? 0,
    seed,
  }
}

function statusOf(match: BackendMatch): MatchStatus {
  if (match.status === 'FINISHED' || match.status === 'BYE') return 'completed'
  if (match.status === 'ONGOING') return 'live'
  return 'upcoming'
}

/** The backend stores a single score string such as "2-1". */
function splitScore(score: string | null): [number | null, number | null] {
  if (!score) return [null, null]
  const parts = score.split(/[-:]/).map(s => Number(s.trim()))
  if (parts.length !== 2 || parts.some(Number.isNaN)) return [null, null]
  return [parts[0], parts[1]]
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex
  if (fromEnd === 1) return 'FINAL'
  if (fromEnd === 2) return 'SEMI-FINAL'
  if (fromEnd === 3) return 'QUARTER-FINAL'
  return `ROUND ${roundIndex + 1}`
}

function fromMatches(tournament: BackendTournament): TournamentBracket | null {
  const matches = (tournament.phases ?? []).flatMap(p => p.matches ?? [])
  if (!matches.length) return null

  const byRound = new Map<number, BackendMatch[]>()
  for (const m of matches) {
    const round = m.round_order ?? 1
    byRound.set(round, [...(byRound.get(round) ?? []), m])
  }

  const orderedRounds = [...byRound.keys()].sort((a, b) => a - b)
  const rounds: BracketRound[] = orderedRounds.map((round, roundIndex) => ({
    label: roundLabel(roundIndex, orderedRounds.length),
    matches: (byRound.get(round) ?? []).map((m, matchIndex): BracketMatch => {
      const [t1, t2] = m.teams ?? []
      const [score1, score2] = splitScore(m.score)
      return {
        id: String(m.id),
        roundIndex,
        matchIndex,
        player1: t1 ? toPlayer(t1, 0) : null,
        player2: t2 ? toPlayer(t2, 0) : null,
        score1,
        score2,
        status: statusOf(m),
        winnerId: m.winner_id != null ? String(m.winner_id) : null,
        scheduledAt: m.created_at ?? '',
        completedAt: m.status === 'FINISHED' ? (m.created_at ?? null) : null,
      }
    }),
  }))

  const final = rounds[rounds.length - 1]?.matches[0]
  const champion =
    final && final.winnerId
      ? [final.player1, final.player2].find(p => p?.id === final.winnerId) ?? null
      : null

  return {
    tournamentId: String(tournament.id),
    bracketType: bracketTypeOf(tournament.phases?.[0]?.type),
    rounds,
    champion,
    provisional: false,
  }
}

function nextPowerOfTwo(n: number): number {
  let size = 1
  while (size < n) size *= 2
  return size
}

/**
 * Seeds registered teams into an empty bracket, padding to a power of two with BYEs so the
 * shape is stable while teams are still joining. Locked teams seed ahead of draft ones, then
 * registration order, which keeps seeding deterministic as the field grows.
 */
function fromRegistrations(tournament: BackendTournament): TournamentBracket | null {
  const teams = [...(tournament.teams ?? [])].sort((a, b) => {
    const aLocked = a.status === TeamStatus.LOCKED ? 0 : 1
    const bLocked = b.status === TeamStatus.LOCKED ? 0 : 1
    return aLocked - bLocked || a.id - b.id
  })
  if (!teams.length) return null

  const slots: (BracketPlayer | null)[] = teams.map((t, i) => toPlayer(t, i + 1))
  const size = nextPowerOfTwo(Math.max(slots.length, 2))
  while (slots.length < size) slots.push(BYE)

  const totalRounds = Math.log2(size)
  const rounds: BracketRound[] = []

  // Round 1 pairs the seeded slots; later rounds are placeholders until results exist.
  let matchesInRound = size / 2
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matches: BracketMatch[] = []
    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      const p1 = roundIndex === 0 ? slots[matchIndex * 2] ?? null : null
      const p2 = roundIndex === 0 ? slots[matchIndex * 2 + 1] ?? null : null
      matches.push({
        id: `provisional-${roundIndex}-${matchIndex}`,
        roundIndex,
        matchIndex,
        player1: p1,
        player2: p2,
        score1: null,
        score2: null,
        // A BYE pairing is already resolved, so show it as decided rather than upcoming.
        status: roundIndex === 0 && (isBye(p1) || isBye(p2)) ? 'completed' : 'upcoming',
        winnerId: roundIndex === 0 && isBye(p2) ? (p1?.id ?? null) : null,
        scheduledAt: '',
        completedAt: null,
      })
    }
    rounds.push({ label: roundLabel(roundIndex, totalRounds), matches })
    matchesInRound /= 2
  }

  return {
    tournamentId: String(tournament.id),
    bracketType: bracketTypeOf(tournament.phases?.[0]?.type),
    rounds,
    champion: null,
    provisional: true,
  }
}

export function buildBracket(
  tournament: BackendTournament | null | undefined,
): TournamentBracket | null {
  if (!tournament) return null
  return fromMatches(tournament) ?? fromRegistrations(tournament)
}

export function getWinnerOfMatch(match: BracketMatch): BracketPlayer | null {
  if (match.winnerId === match.player1?.id) return match.player1
  if (match.winnerId === match.player2?.id) return match.player2
  return null
}
