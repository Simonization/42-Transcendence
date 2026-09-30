import { describe, it, expect } from 'vitest'
import { buildBracket, canActFor, getWinnerOfMatch, isBye, matchPermissions, canOpenMatchChat } from '../bracket'
import { PhaseType, TeamStatus, TournamentStatus } from '../../types'
import type { BackendTeam, BackendTournament, BracketMatch } from '../../types'
import type { BackendMatch, SeedingView } from '../../types/tournament'

const team = (id: number, name: string, status = TeamStatus.LOCKED): BackendTeam =>
  ({ id, name, status, captain_id: 100 + id, members: [{ id: 100 + id, username: name }], admins: [] }) as BackendTeam

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

/** What GET /tournaments/:id/seeding returns for `ids` (seed 1 first) and the given pairs. */
const seeding = (
  teams: BackendTeam[],
  pairs: [number | null, number | null][],
  over: Partial<SeedingView> = {},
): SeedingView => ({
  tournamentId: 1,
  started: false,
  phaseType: PhaseType.SINGLE_ELIMINATION,
  teams: teams.map((t, i) => ({ id: t.id, name: t.name, status: 'LOCKED', seed: i + 1, memberCount: 1 })),
  pairs,
  groups: [],
  excluded: [],
  ...over,
})

const match = (over: Partial<BackendMatch>): BackendMatch =>
  ({
    id: 1,
    phase_id: 1,
    round_order: 1,
    status: 'WAITING',
    team1_id: null,
    team2_id: null,
    team1_score: null,
    team2_score: null,
    winner_id: null,
    score: null,
    created_at: '2026-09-02T00:00:00Z',
    ...over,
  }) as BackendMatch

const withMatches = (matches: BackendMatch[], over: Partial<BackendTournament> = {}) =>
  tournament({
    status: TournamentStatus.ONGOING,
    phases: [{ id: 1, order: 1, type: PhaseType.SINGLE_ELIMINATION, matches }],
    ...over,
  } as Partial<BackendTournament>)

describe('buildBracket', () => {
  it('returns null without seeding or matches', () => {
    expect(buildBracket(tournament())).toBeNull()
    expect(buildBracket(tournament({ teams: [team(1, 'A')] }))).toBeNull()
    expect(buildBracket(null)).toBeNull()
  })

  describe('provisional (drawn from the backend seeding)', () => {
    const five = [1, 2, 3, 4, 5].map(i => team(i, `T${i}`))
    const fivePairs: [number | null, number | null][] = [
      [1, null],
      [4, 5],
      [2, null],
      [3, null],
    ]

    it('draws exactly the pairs the backend will generate, byes included', () => {
      const b = buildBracket(tournament({ teams: five, seeding: seeding(five, fivePairs) }))!

      expect(b.provisional).toBe(true)
      expect(b.rounds).toHaveLength(3)
      expect(b.rounds[0].matches.map(m => [m.player1?.username, m.player2?.username])).toEqual([
        ['T1', 'BYE'],
        ['T4', 'T5'],
        ['T2', 'BYE'],
        ['T3', 'BYE'],
      ])
      // No BYE-v-BYE match, ever.
      for (const m of b.rounds[0].matches) expect(isBye(m.player1) && isBye(m.player2)).toBe(false)
    })

    it('awards a walkover when a seed is paired with a BYE', () => {
      const b = buildBracket(tournament({ teams: five, seeding: seeding(five, fivePairs) }))!
      const walkover = b.rounds[0].matches[0]
      expect(walkover.status).toBe('completed')
      expect(walkover.winnerId).toBe('1')
    })

    it('moves bye winners into round 2, as the start will', () => {
      const b = buildBracket(tournament({ teams: five, seeding: seeding(five, fivePairs) }))!
      expect(b.rounds[1].matches.map(m => [m.player1?.username ?? null, m.player2?.username ?? null])).toEqual([
        ['T1', null],
        ['T2', 'T3'],
      ])
    })

    it('shows only the teams the seeding enters, with their seeds', () => {
      const teams = [team(10, 'Draft', TeamStatus.DRAFT), team(20, 'Locked'), team(30, 'Other')]
      const view = seeding([teams[1], teams[2]], [[20, 30]], {
        excluded: [{ id: 10, name: 'Draft', status: 'DRAFT' }],
      })
      const b = buildBracket(tournament({ teams, seeding: view }))!
      const names = b.rounds.flatMap(r => r.matches.flatMap(m => [m.player1?.username, m.player2?.username]))
      expect(names).not.toContain('Draft')
      expect(b.rounds[0].matches[0].player1).toMatchObject({ username: 'Locked', seed: 1 })
    })

    it('labels the closing rounds', () => {
      const eight = Array.from({ length: 8 }, (_, i) => team(i + 1, `T${i}`))
      const pairs = [[1, 8], [4, 5], [2, 7], [3, 6]] as [number, number][]
      const b = buildBracket(tournament({ teams: eight, seeding: seeding(eight, pairs) }))!
      expect(b.rounds.map(r => r.label)).toEqual(['QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'])
    })

    it('lists groups for a group stage', () => {
      const four = [1, 2, 3, 4].map(i => team(i, `T${i}`))
      const view = seeding(four, [], { phaseType: PhaseType.GROUP_STAGE, groups: [[1, 4], [2, 3]] })
      const b = buildBracket(tournament({ teams: four, seeding: view }))!
      expect(b.rounds).toEqual([])
      expect(b.groups!.map(g => [g.label, g.players.map(p => p.username)])).toEqual([
        ['A', ['T1', 'T4']],
        ['B', ['T2', 'T3']],
      ])
    })
  })

  describe('from persisted matches', () => {
    const teams = [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie'), team(4, 'Delta')]

    it('reads the two slots in order, with seeds from the frozen seeding', () => {
      const t = withMatches([match({ team1_id: 9, team2_id: 7, status: 'READY' })], {
        teams: [team(7, 'Alpha'), team(9, 'Bravo')],
        seed_order: [7, 9],
      })
      const m = buildBracket(t)!.rounds[0].matches[0]
      expect(m.player1).toMatchObject({ username: 'Bravo', seed: 2 })
      expect(m.player2).toMatchObject({ username: 'Alpha', seed: 1 })
      expect(m.state).toBe('READY')
      expect(m.matchId).toBe(1)
    })

    it('prefers real matches over the seeding', () => {
      const t = withMatches([match({ team1_id: 1, team2_id: 2 })], {
        teams,
        seeding: seeding(teams, [[1, 4], [2, 3]]),
      })
      const b = buildBracket(t)!
      expect(b.provisional).toBe(false)
      expect(b.rounds[0].matches).toHaveLength(1)
    })

    it('uses the numeric scores, falling back to the legacy score string', () => {
      const t = withMatches([
        match({ id: 1, status: 'FINISHED', team1_id: 1, team2_id: 2, team1_score: 3, team2_score: 1, winner_id: 1 }),
        match({ id: 2, status: 'FINISHED', team1_id: 3, team2_id: 4, score: '0-2', winner_id: 4 }),
      ], { teams })
      const [a, b] = buildBracket(t)!.rounds[0].matches
      expect([a.score1, a.score2]).toEqual([3, 1])
      expect([b.score1, b.score2]).toEqual([0, 2])
    })

    it('shows a first-round bye as a BYE slot', () => {
      const t = withMatches([match({ status: 'BYE', team1_id: 1, winner_id: 1 })], { teams })
      const m = buildBracket(t)!.rounds[0].matches[0]
      expect(isBye(m.player2)).toBe(true)
      expect(m.status).toBe('completed')
    })

    it('maps backend statuses onto the view-model vocabulary', () => {
      const cases: Array<[BackendMatch['status'], string]> = [
        ['WAITING', 'upcoming'],
        ['READY', 'upcoming'],
        ['ONGOING', 'live'],
        ['AWAITING_CONFIRMATION', 'live'],
        ['DISPUTED', 'live'],
        ['FINISHED', 'completed'],
        ['BYE', 'completed'],
      ]
      for (const [backend, expected] of cases) {
        expect(buildBracket(withMatches([match({ status: backend })]))!.rounds[0].matches[0].status).toBe(expected)
      }
    })

    it('orders each round by position in the tree, not by id', () => {
      // Final id 1; semis id 2 feeds slot 2 and id 3 feeds slot 1.
      const t = withMatches([
        match({ id: 1, round_order: 2 }),
        match({ id: 2, round_order: 1, team1_id: 3, team2_id: 4, winner_next_match_id: 1, winner_next_match_slot: 2 }),
        match({ id: 3, round_order: 1, team1_id: 1, team2_id: 2, winner_next_match_id: 1, winner_next_match_slot: 1 }),
      ], { teams })
      const b = buildBracket(t)!
      expect(b.rounds.map(r => r.label)).toEqual(['SEMI-FINAL', 'FINAL'])
      expect(b.rounds[0].matches.map(m => m.id)).toEqual(['3', '2'])
    })

    it('reports the champion once the final has a winner', () => {
      const t = withMatches(
        [match({ id: 9, status: 'FINISHED', winner_id: 2, team1_id: 1, team2_id: 2, finished_at: '2026-09-03T00:00:00Z' })],
        { teams, finished_at: '2026-09-03T00:00:00Z' },
      )
      const b = buildBracket(t)!
      expect(b.champion?.username).toBe('Bravo')
      expect(b.rounds[0].matches[0].completedAt).toBe('2026-09-03T00:00:00Z')
      expect(b.completedAt).toBe('2026-09-03T00:00:00Z')
    })

    it('renders a group stage as groups, apart from the knockout rounds', () => {
      const t = tournament({
        status: TournamentStatus.ONGOING,
        teams,
        phases: [
          {
            id: 1,
            order: 1,
            type: PhaseType.GROUP_STAGE,
            matches: [
              match({ id: 1, group_index: 0, round_order: 1, team1_id: 1, team2_id: 4, status: 'READY' }),
              match({ id: 2, group_index: 1, round_order: 1, team1_id: 2, team2_id: 3, status: 'READY' }),
              match({ id: 3, group_index: 0, round_order: 2, team1_id: 4, team2_id: 1, status: 'READY' }),
            ],
          },
          { id: 2, order: 2, type: PhaseType.SINGLE_ELIMINATION, matches: [] },
        ],
        standings: [
          {
            phaseId: 1,
            phaseOrder: 1,
            type: PhaseType.GROUP_STAGE,
            qualifiersPerGroup: 1,
            groups: [
              {
                index: 0,
                label: 'A',
                rows: [
                  { teamId: 1, name: 'Alpha', rank: 1, played: 0, wins: 0, losses: 0, points: 0, scoreFor: 0, scoreAgainst: 0, scoreDiff: 0, seed: 1, withdrawn: false },
                ],
              },
            ],
          },
        ],
      } as Partial<BackendTournament>)

      const b = buildBracket(t)!
      expect(b.rounds).toEqual([])
      expect(b.groups!.map(g => g.label)).toEqual(['A', 'B'])
      expect(b.groups![0].rounds.map(r => r.label)).toEqual(['MATCHDAY 1', 'MATCHDAY 2'])
      expect(b.groups![0].standings[0].name).toBe('Alpha')
      expect(b.groups![0].qualifiersPerGroup).toBe(1)
    })
  })

  it('derives the bracket type from the phase', () => {
    const teams = [team(1, 'A'), team(2, 'B')]
    const of = (type: PhaseType) =>
      buildBracket(tournament({ teams, seeding: seeding(teams, [[1, 2]], { phaseType: type }) }))!.bracketType

    expect(of(PhaseType.DOUBLE_ELIMINATION)).toBe('double-elimination')
    expect(of(PhaseType.ROUND_ROBIN)).toBe('round-robin')
    expect(of(PhaseType.SINGLE_ELIMINATION)).toBe('single-elimination')
  })
})

describe('getWinnerOfMatch', () => {
  it('resolves the winning slot, or null when undecided', () => {
    const teams = [team(1, 'Alpha'), team(2, 'Bravo')]
    const b = buildBracket(tournament({ teams, seeding: seeding(teams, [[1, 2]]) }))!
    const m = b.rounds[0].matches[0]

    expect(getWinnerOfMatch(m)).toBeNull()
    expect(getWinnerOfMatch({ ...m, winnerId: m.player2!.id })?.username).toBe('Bravo')
  })
})

describe('match permissions', () => {
  const alpha = { ...team(1, 'Alpha'), admins: [{ id: 1, userId: 555, teamId: 1, grantedBy: 101, grantedAt: '' }] } as BackendTeam
  const bravo = team(2, 'Bravo')

  const view = (over: Partial<BackendMatch>): BracketMatch =>
    buildBracket(withMatches([match({ team1_id: 1, team2_id: 2, status: 'READY', ...over })], { teams: [alpha, bravo] }))!
      .rounds[0].matches[0]

  it('knows the captain and admins of a team', () => {
    const m = view({})
    expect(canActFor(m.player1, 101)).toBe(true)
    expect(canActFor(m.player1, 555)).toBe(true)
    expect(canActFor(m.player1, 102)).toBe(false)
  })

  it('lets either team report a READY match, and nobody else', () => {
    expect(matchPermissions(view({}), 101, false, true).report).toBe(true)
    expect(matchPermissions(view({}), 102, false, true).report).toBe(true)
    expect(matchPermissions(view({}), 999, false, true).report).toBe(false)
  })

  it('asks the other team to confirm, and lets the reporter correct', () => {
    const m = view({ status: 'AWAITING_CONFIRMATION', reported_by_team_id: 1, team1_score: 2, team2_score: 0 })
    expect(matchPermissions(m, 102, false, true)).toMatchObject({ confirm: true, dispute: true, report: false })
    expect(matchPermissions(m, 101, false, true)).toMatchObject({ confirm: false, dispute: false, report: true })
  })

  it('gives global admins resolve and withdraw on open matches, undo on finished ones', () => {
    expect(matchPermissions(view({ status: 'DISPUTED' }), 1, true, true)).toMatchObject({
      resolve: true,
      withdraw: true,
      undo: false,
    })
    expect(matchPermissions(view({ status: 'FINISHED', winner_id: 1 }), 1, true, false)).toMatchObject({
      resolve: false,
      undo: true,
    })
    expect(matchPermissions(view({}), 1, false, true).resolve).toBe(false)
  })

  it('offers nothing on a match whose opponent is not known yet', () => {
    const m = view({ team2_id: null, status: 'WAITING' })
    expect(Object.values(matchPermissions(m, 101, false, true)).some(Boolean)).toBe(false)
  })
})

describe('canOpenMatchChat', () => {
  const view = (over: Partial<BackendMatch>): BracketMatch =>
    buildBracket(
      withMatches([match({ team1_id: 1, team2_id: 2, status: 'READY', ...over })], { teams: [team(1, 'Alpha'), team(2, 'Bravo')] }),
    )!.rounds[0].matches[0]

  it('is open to every member of either team, and to nobody else', () => {
    const m = view({})
    expect(canOpenMatchChat(m, 101)).toBe(true)
    expect(canOpenMatchChat(m, 102)).toBe(true)
    expect(canOpenMatchChat(m, 999)).toBe(false)
    expect(canOpenMatchChat(m, null)).toBe(false)
  })

  it('needs a match that has been ready: not while waiting, not a bye or a walkover', () => {
    expect(canOpenMatchChat(view({ status: 'WAITING', team2_id: null }), 101)).toBe(false)
    expect(canOpenMatchChat(view({ status: 'BYE', team2_id: null }), 101)).toBe(false)
    expect(canOpenMatchChat(view({ status: 'FINISHED', winner_id: 1, game_data: { walkover: true } }), 101)).toBe(false)
  })

  it('stays available for disputes and after the match finished', () => {
    expect(canOpenMatchChat(view({ status: 'DISPUTED' }), 101)).toBe(true)
    expect(canOpenMatchChat(view({ status: 'FINISHED', winner_id: 1 }), 102)).toBe(true)
  })
})
