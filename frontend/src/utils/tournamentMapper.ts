/**
 * Tournament Mapper
 * Converts backend tournament entities to the display format used by UI components
 */

import type { BackendTournament } from '../types'
import { TournamentStatus, PhaseType, TeamStatus } from '../types'
import type { Tournament } from '../types'
import { isRegistrationOpen } from './registration'

const statusMap: Record<TournamentStatus, Tournament['status']> = {
  [TournamentStatus.DRAFT]: 'open',
  [TournamentStatus.REGISTRATION_OPEN]: 'open',
  [TournamentStatus.ONGOING]: 'live',
  [TournamentStatus.COMPLETED]: 'finished',
}

const formatMap: Partial<Record<PhaseType, Tournament['format']>> = {
  [PhaseType.SINGLE_ELIMINATION]: 'single-elimination',
  [PhaseType.DOUBLE_ELIMINATION]: 'double-elimination',
  [PhaseType.ROUND_ROBIN]: 'round-robin',
  [PhaseType.SWISS]: 'round-robin',
  [PhaseType.GROUP_STAGE]: 'round-robin',
}

/**
 * Registered teams, counted like the backend's availability (`lockedTeams`), so "Registered n/max"
 * and "spots left" agree: LOCKED teams before start (DRAFT teams are still recruiting and do not
 * hold a spot), the entrants once started (completion archives every team).
 */
export function registeredTeamCount(bt: Pick<BackendTournament, 'status' | 'teams' | 'seed_order'>): number {
  const started = bt.status === TournamentStatus.ONGOING || bt.status === TournamentStatus.COMPLETED
  if (started && bt.seed_order) return bt.seed_order.length
  return (bt.teams ?? []).filter((t) => t.status === TeamStatus.LOCKED).length
}

export function toDisplayTournament(bt: BackendTournament): Tournament {
  const firstPhase = bt.phases[0]
  const gameName = firstPhase?.game?.name ?? 'Unknown'
  const format = firstPhase ? (formatMap[firstPhase.type] ?? 'single-elimination') : 'single-elimination'

  return {
    id: String(bt.id),
    name: bt.name,
    game: gameName,
    date: bt.createdAt?.split('T')[0] ?? '',
    endDate: bt.finished_at?.split('T')[0] ?? '',
    status: statusMap[bt.status] ?? 'open',
    registrationOpen: isRegistrationOpen(bt),
    maxParticipants: bt.max_participants,
    currentParticipants: registeredTeamCount(bt),
    format,
    description: bt.description ?? '',
    rules: '',
    prize: '',
    organizer: {
      name: '',
    },
  }
}
