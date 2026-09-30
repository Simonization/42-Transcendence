/**
 * PublicTournamentPage — /t/:id: reachable without a login, read-only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { UserRole } from '../../types'
import type { BackendTournament } from '../../types'

const { getTournament } = vi.hoisted(() => ({ getTournament: vi.fn() }))

vi.mock('../../api/public', () => ({
  publicApi: { getTournament },
  shareUrl: (id: number) => `http://localhost/api/share/t/${id}`,
  publicPageUrl: (id: number) => `http://localhost/t/${id}`,
}))

import PublicTournamentPage from '../PublicTournamentPage.vue'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import { buildBracket } from '../../utils/bracket'
import { isPublicRoute } from '../../router/publicRoutes'

const team = (id: number, name: string) => ({ id, name, status: 'LOCKED' })

function tournamentFixture(over: Partial<BackendTournament> = {}): BackendTournament {
  const alpha = team(1, 'Alpha')
  const bravo = team(2, 'Bravo')
  return {
    id: 7,
    name: 'Autumn Cup',
    description: 'Open to everyone',
    max_participants: 8,
    status: 'ONGOING',
    createdAt: '2026-07-01',
    seed_order: [1, 2],
    teams: [alpha, bravo],
    seeding: { tournamentId: 7, started: true, phaseType: 'SINGLE_ELIMINATION', teams: [], pairs: [], groups: [], excluded: [] },
    standings: [],
    podium: null,
    phases: [
      {
        id: 1, tournament_id: 7, order: 1, type: 'SINGLE_ELIMINATION', game_id: 1,
        teams_limit_start: 2, teams_limit_end: 1,
        matches: [
          {
            id: 10, phase_id: 1, round_order: 1, status: 'READY', team1_id: 1, team2_id: 2, team1: alpha, team2: bravo,
            team1_score: null, team2_score: null, winner_id: null, score: null, created_at: '2026-08-01',
          },
        ],
      },
    ],
    ...over,
  } as unknown as BackendTournament
}

async function mountAt(path = '/t/7') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/auth', component: { template: '<div />' } },
      { path: '/menu/user', component: { template: '<div />' } },
      { path: '/t/:id', component: PublicTournamentPage },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(PublicTournamentPage, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('PublicTournamentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('is a public route for the router guard', () => {
    expect(isPublicRoute({ path: '/t/7' })).toBe(true)
    expect(isPublicRoute({ path: '/menu/teams/7' })).toBe(false)
  })

  it('loads the tournament anonymously and shows the bracket read-only', async () => {
    getTournament.mockResolvedValue(tournamentFixture())

    const wrapper = await mountAt()

    expect(getTournament).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Autumn Cup')
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Bravo')
    // Share is offered; nothing that acts on a match is.
    expect(wrapper.find('.share-btn').exists()).toBe(true)
    expect(wrapper.find('[data-testid="podium"]').exists()).toBe(false)
  })

  it('has no match actions even for a global admin looking at a playable match', async () => {
    getTournament.mockResolvedValue(tournamentFixture())
    const auth = useAuthStore()
    auth.user = { id: 99, username: 'root', role: UserRole.ADMIN } as any

    const wrapper = await mountAt()
    await wrapper.find('.match-card').trigger('click')

    expect(wrapper.find('.match-detail').exists()).toBe(true)
    expect(wrapper.find('.match-actions').exists()).toBe(false)
    expect(wrapper.find('.action-btn').exists()).toBe(false)
    expect(wrapper.find('.score-input').exists()).toBe(false)
  })

  it('control: the same match does offer actions on the interactive (logged-in) bracket', async () => {
    const auth = useAuthStore()
    auth.user = { id: 99, username: 'root', role: UserRole.ADMIN } as any
    const wrapper = mount(BracketVisualization, {
      props: { bracket: buildBracket(tournamentFixture())!, tournamentStatus: 'ONGOING', interactive: true },
    })
    await wrapper.find('.match-card').trigger('click')
    expect(wrapper.find('.match-actions').exists()).toBe(true)
    // ...and there, team names lead to the team profile.
    expect(wrapper.find('.player-link').exists()).toBe(true)
  })

  it('does not turn team names into links to login-only pages', async () => {
    getTournament.mockResolvedValue(tournamentFixture())
    const wrapper = await mountAt()
    expect(wrapper.find('.player-link').exists()).toBe(false)
  })

  it('shows the podium once the tournament is completed', async () => {
    getTournament.mockResolvedValue(
      tournamentFixture({
        status: 'COMPLETED' as any,
        podium: { first: { teamId: 1, name: 'Alpha' }, second: { teamId: 2, name: 'Bravo' }, third: [] },
      }),
    )

    const wrapper = await mountAt()

    const podium = wrapper.find('[data-testid="podium"]')
    expect(podium.exists()).toBe(true)
    expect(podium.text()).toContain('Alpha')
    expect(podium.text()).toContain('Bravo')
  })

  it('says so when the tournament does not exist or is not public', async () => {
    getTournament.mockRejectedValue(new Error('404'))

    const wrapper = await mountAt('/t/999')

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('.match-card').exists()).toBe(false)
  })

  it('sends visitors without an account to sign in, and signed-in ones to the app', async () => {
    getTournament.mockResolvedValue(tournamentFixture())
    expect((await mountAt()).find('.public-cta').attributes('href')).toBe('/auth')

    sessionStorage.setItem('accessToken', 'x')
    const signedIn = await mountAt()
    expect(signedIn.find('.public-cta').attributes('href')).toBe('/menu/user')
  })
})
