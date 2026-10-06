import { describe, it, expect } from 'vitest'
import { registeredTeamCount, toDisplayTournament } from '../tournamentMapper'
import { TeamStatus, TournamentStatus } from '../../types'
import type { BackendTournament } from '../../types'

const tournament = (over: Partial<BackendTournament> = {}): BackendTournament =>
  ({
    id: 1,
    name: 'Cup',
    status: TournamentStatus.REGISTRATION_OPEN,
    max_participants: 64,
    phases: [],
    teams: [
      { id: 1, status: TeamStatus.LOCKED },
      { id: 2, status: TeamStatus.LOCKED },
      { id: 3, status: TeamStatus.DRAFT },
      { id: 4, status: TeamStatus.DRAFT },
      { id: 5, status: TeamStatus.DRAFT },
    ],
    seed_order: null,
    ...over,
  }) as unknown as BackendTournament

describe('registered team count', () => {
  it('counts LOCKED teams before start, like spots left does (5 teams, 2 locked: 2/64, 62 left)', () => {
    expect(registeredTeamCount(tournament())).toBe(2)
    expect(toDisplayTournament(tournament()).currentParticipants).toBe(2)
  })

  it('counts the entrants once started, even after completion archived every team', () => {
    const done = tournament({
      status: TournamentStatus.COMPLETED,
      seed_order: [1, 2],
      teams: [
        { id: 1, status: TeamStatus.ARCHIVED },
        { id: 2, status: TeamStatus.ARCHIVED },
        { id: 3, status: TeamStatus.ARCHIVED },
      ] as never,
    })
    expect(registeredTeamCount(done)).toBe(2)
  })
})
