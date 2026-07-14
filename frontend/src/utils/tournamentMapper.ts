/**
 * Tournament Mapper
 * Converts backend tournament entities to the display format used by UI components
 */

import type { BackendTournament } from '../types'
import { TournamentStatus, PhaseType } from '../types'
import type { Tournament } from '../data/mockTournaments'

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

export function toDisplayTournament(bt: BackendTournament): Tournament {
  const firstPhase = bt.phases[0]
  const gameName = firstPhase?.game?.name ?? 'Unknown'
  const format = firstPhase ? (formatMap[firstPhase.type] ?? 'single-elimination') : 'single-elimination'

  return {
    id: String(bt.id),
    name: bt.name,
    game: gameName,
    date: bt.createdAt?.split('T')[0] ?? '',
    endDate: '',
    status: statusMap[bt.status] ?? 'open',
    maxParticipants: bt.max_participants,
    currentParticipants: bt.teams?.length ?? 0,
    format,
    description: bt.description ?? '',
    rules: '',
    prize: '',
    organizer: {
      name: '',
      avatar: '🏆',
    },
  }
}
