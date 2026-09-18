import { describe, it, expect } from 'vitest'
import { buildBracket, getWinnerOfMatch, isBye } from '../bracket'
import { PhaseType, TeamStatus, TournamentStatus } from '../../types'
import type { BackendMatch, BackendTeam, BackendTournament } from '../../types'

const team = (id: number, name: string, status = TeamStatus.LOCKED): BackendTeam =>
  ({ id, name, status, captain_id: id, members: [{ id, username: name }] }) as BackendTeam

const tournament = (over: Partial<BackendTournament> = {}): BackendTournament =>
  ({
    id: 1,
    name: 'Cup',
    description: null,
    max_participants: 16,
    status: TournamentStatus.REGISTRATION_OPEN,
    phases: [{ id: 1, order: 1, type: PhaseType.SINGLE_ELIMINATION, matches: [] }],
    teams: [],
    createdAt: '2026-09-01T00:00:00Z',
    ...over,
  }) as BackendTournament

describe('buildBracket', () => {
  it('returns null without teams or matches', () => {
    expect(buildBracket(tournament())).toBeNull()
    expect(buildBracket(null)).toBeNull()
  })

  describe('provisional (seeded from registrations)', () => {
    it('pads a 5-team field to 8 slots with BYEs', () => {
      const teams = [1, 2, 3, 4, 5].map(i => team(i, `T${i}`))
      const b = buildBracket(tournament({ teams }))!

      expect(b.provisional).toBe(true)
      expect(b.rounds).toHaveLength(3) // 8 -> 4 -> 2 -> 1
      expect(b.rounds[0].matches).toHaveLength(4)

      const round1 = b.rounds[0].matches.flatMap(m => [m.player1, m.player2])
      expect(round1.filter(p => p && !isBye(p))).toHaveLength(5)
      expect(round1.filter(isBye)).toHaveLength(3)
    })

    it('grows the bracket as more teams register', () => {
      const sizes = [2, 3, 5, 9].map(
        n => buildBracket(tournament({ teams: Array.from({ length: n }, (_, i) => team(i + 1, `T${i}`)) }))!
          .rounds[0].matches.length * 2,
      )
      expect(sizes).toEqual([2, 4, 8, 16])
    })

    it('awards a walkover when a seed is paired with a BYE', () => {
      const b = buildBracket(tournament({ teams: [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie')] }))!
      const walkover = b.rounds[0].matches.find(m => isBye(m.player2))!

      expect(walkover.status).toBe('completed')
      expect(walkover.winnerId).toBe(walkover.player1!.id)
    })

    it('seeds locked teams ahead of still-recruiting ones', () => {
      const teams = [
        team(10, 'Draft', TeamStatus.DRAFT),
        team(20, 'Locked', TeamStatus.LOCKED),
      ]
      const b = buildBracket(tournament({ teams }))!

      expect(b.rounds[0].matches[0].player1?.username).toBe('Locked')
      expect(b.rounds[0].matches[0].player2?.username).toBe('Draft')
    })

    it('labels the closing rounds', () => {
      const teams = Array.from({ length: 8 }, (_, i) => team(i + 1, `T${i}`))
      const b = buildBracket(tournament({ teams }))!
      expect(b.rounds.map(r => r.label)).toEqual(['QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'])
    })
  })

  describe('from persisted matches', () => {
    const match = (over: Partial<BackendMatch>): BackendMatch =>
      ({
        id: 1,
        phase_id: 1,
        round_order: 1,
        status: 'WAITING',
        teams: [],
        winner_id: null,
        score: null,
        created_at: '2026-09-02T00:00:00Z',
        ...over,
      }) as BackendMatch

    it('prefers real matches over the provisional seeding', () => {
      const t = tournament({
        teams: [team(1, 'Alpha'), team(2, 'Bravo')],
        phases: [
          {
            id: 1,
            order: 1,
            type: PhaseType.SINGLE_ELIMINATION,
            matches: [match({ teams: [team(1, 'Alpha'), team(2, 'Bravo')] })],
          },
        ],
      } as Partial<BackendTournament>)

      const b = buildBracket(t)!
      expect(b.provisional).toBe(false)
      expect(b.rounds[0].matches[0].player1?.username).toBe('Alpha')
    })

    it('splits the single score string into two numbers', () => {
      const t = tournament({
        phases: [
          {
            id: 1,
            order: 1,
            type: PhaseType.SINGLE_ELIMINATION,
            matches: [
              match({
                status: 'FINISHED',
                score: '2-1',
                winner_id: 1,
                teams: [team(1, 'Alpha'), team(2, 'Bravo')],
              }),
            ],
          },
        ],
      } as Partial<BackendTournament>)

      const m = buildBracket(t)!.rounds[0].matches[0]
      expect([m.score1, m.score2]).toEqual([2, 1])
      expect(m.status).toBe('completed')
    })

    it('leaves scores null when the string is absent or malformed', () => {
      for (const score of [null, 'walkover', '1-2-3']) {
        const t = tournament({
          phases: [
            { id: 1, order: 1, type: PhaseType.SINGLE_ELIMINATION, matches: [match({ score })] },
          ],
        } as Partial<BackendTournament>)
        const m = buildBracket(t)!.rounds[0].matches[0]
        expect([m.score1, m.score2]).toEqual([null, null])
      }
    })

    it('maps backend statuses onto the view-model vocabulary', () => {
      const cases: Array<[BackendMatch['status'], string]> = [
        ['WAITING', 'upcoming'],
        ['READY', 'upcoming'],
        ['ONGOING', 'live'],
        ['FINISHED', 'completed'],
        ['BYE', 'completed'],
      ]
      for (const [backend, expected] of cases) {
        const t = tournament({
          phases: [
            { id: 1, order: 1, type: PhaseType.SINGLE_ELIMINATION, matches: [match({ status: backend })] },
          ],
        } as Partial<BackendTournament>)
        expect(buildBracket(t)!.rounds[0].matches[0].status).toBe(expected)
      }
    })

    it('groups matches into rounds by round_order', () => {
      const t = tournament({
        phases: [
          {
            id: 1,
            order: 1,
            type: PhaseType.SINGLE_ELIMINATION,
            matches: [
              match({ id: 1, round_order: 1 }),
              match({ id: 2, round_order: 1 }),
              match({ id: 3, round_order: 2 }),
            ],
          },
        ],
      } as Partial<BackendTournament>)

      const b = buildBracket(t)!
      expect(b.rounds.map(r => r.matches.length)).toEqual([2, 1])
      expect(b.rounds.map(r => r.label)).toEqual(['SEMI-FINAL', 'FINAL'])
    })

    it('reports the champion once the final has a winner', () => {
      const t = tournament({
        phases: [
          {
            id: 1,
            order: 1,
            type: PhaseType.SINGLE_ELIMINATION,
            matches: [
              match({
                id: 9,
                round_order: 1,
                status: 'FINISHED',
                winner_id: 2,
                teams: [team(1, 'Alpha'), team(2, 'Bravo')],
              }),
            ],
          },
        ],
      } as Partial<BackendTournament>)

      expect(buildBracket(t)!.champion?.username).toBe('Bravo')
    })
  })

  it('derives the bracket type from phase 1', () => {
    const teams = [team(1, 'A'), team(2, 'B')]
    const of = (type: PhaseType) =>
      buildBracket(tournament({ teams, phases: [{ id: 1, order: 1, type, matches: [] }] } as Partial<BackendTournament>))!
        .bracketType

    expect(of(PhaseType.DOUBLE_ELIMINATION)).toBe('double-elimination')
    expect(of(PhaseType.ROUND_ROBIN)).toBe('round-robin')
    expect(of(PhaseType.GROUP_STAGE)).toBe('single-elimination')
  })
})

describe('getWinnerOfMatch', () => {
  it('resolves the winning slot, or null when undecided', () => {
    const b = buildBracket(tournament({ teams: [team(1, 'Alpha'), team(2, 'Bravo')] }))!
    const m = b.rounds[0].matches[0]

    expect(getWinnerOfMatch(m)).toBeNull()
    expect(getWinnerOfMatch({ ...m, winnerId: m.player2!.id })?.username).toBe('Bravo')
  })
})
