/**
 * TournamentDetailCard Tests — registration CTA states, "tournament full", request to join and
 * the looking-for-team board.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'

const { teamsApi, push, tournamentRef } = vi.hoisted(() => ({
  push: vi.fn(),
  tournamentRef: { current: null as unknown },
  teamsApi: {
    getMyTeam: vi.fn(),
    getLookingForTeam: vi.fn(),
    requestToJoin: vi.fn(),
    flagLookingForTeam: vi.fn(),
    unflagLookingForTeam: vi.fn(),
    invitePlayer: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
  useRouter: () => ({ push }),
}))
vi.mock('../../../api/teams', () => ({ teamsApi }))
vi.mock('../../../composables/useTournaments', () => ({
  useTournaments: () => ({
    currentTournament: ref(tournamentRef.current),
    isLoading: ref(false),
    error: ref(''),
    fetchTournament: vi.fn(),
    register: vi.fn(),
  }),
}))
vi.mock('../../../components/tournaments/BracketVisualization.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('../../../components/tournaments/TournamentRegistrationModal.vue', () => ({
  default: {
    name: 'TournamentRegistrationModal',
    props: ['isOpen', 'isFull'],
    template: '<div class="mock-modal" :data-open="isOpen" :data-full="isFull" />',
  },
}))

import TournamentDetailCard from '../TournamentDetailCard.vue'
import { useAuthStore } from '../../../stores/auth'

const tournament = (status = 'REGISTRATION_OPEN', teams: unknown[] = []) => ({
  id: 1,
  name: 'Spring Cup',
  description: '',
  max_participants: 2,
  status,
  createdAt: '2026-09-01T00:00:00Z',
  phases: [{ id: 1, order: 1, type: 'SINGLE_ELIMINATION', game: { name: 'Pong', teamSize: 2 }, matches: [] }],
  teams,
})

const OPEN = { tournamentId: 1, maxTeams: 2, lockedTeams: 0, spotsLeft: 2, full: false, registrationOpen: true }
const FULL = { ...OPEN, lockedTeams: 2, spotsLeft: 0, full: true }

function setup(opts: {
  status?: string
  teams?: unknown[]
  me?: number
  team?: unknown
  availability?: unknown
  lft?: unknown[]
  requests?: unknown[]
  lookingForTeam?: unknown
} = {}) {
  tournamentRef.current = tournament(opts.status, opts.teams)
  useAuthStore().$patch({ user: { id: opts.me ?? 1, username: 'me' } as never })
  teamsApi.getMyTeam.mockResolvedValue({
    team: opts.team ?? null,
    invitation: null,
    requests: opts.requests ?? [],
    availability: opts.availability ?? OPEN,
    lookingForTeam: opts.lookingForTeam ?? null,
  })
  teamsApi.getLookingForTeam.mockResolvedValue(opts.lft ?? [])
}

async function mountCard() {
  const wrapper = mount(TournamentDetailCard)
  await flushPromises()
  return wrapper
}

const cta = (w: VueWrapper) => w.find('.detail-cta-btn')
const openLftTab = (w: VueWrapper) => w.find('#tab-lft').trigger('click')

describe('TournamentDetailCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('registration CTA', () => {
    it('offers registration while there is room', async () => {
      setup()
      const wrapper = await mountCard()
      expect(cta(wrapper).text()).toContain('REGISTER NOW')
      expect(cta(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('shows "tournament full" and disables registration when every spot is taken', async () => {
      setup({ availability: FULL })
      const wrapper = await mountCard()

      expect(cta(wrapper).text()).toContain('TOURNAMENT FULL')
      expect(cta(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.find('.spots-left-full').exists()).toBe(true)
      expect(wrapper.find('.mock-modal').attributes('data-full')).toBe('true')
    })

    it('shows the remaining spots on the overview', async () => {
      setup()
      const wrapper = await mountCard()
      expect(wrapper.find('.spots-left').text()).toContain('2 spot(s) left')
    })

    it('disables registration once registration is closed', async () => {
      setup({ status: 'ONGOING', availability: { ...OPEN, registrationOpen: false } })
      const wrapper = await mountCard()
      expect(cta(wrapper).text()).toContain('Registration closed')
      expect(cta(wrapper).attributes('disabled')).toBeDefined()
    })

    it('takes a user who already has a team to the team page instead of the modal', async () => {
      setup({ team: { id: 5, status: 'DRAFT', captain_id: 1, members: [{ id: 1 }], admins: [] } })
      const wrapper = await mountCard()

      await cta(wrapper).trigger('click')

      expect(push).toHaveBeenCalledWith('/menu/tournaments/1/team')
    })

    it('a registered (locked) team is not blocked by "full"', async () => {
      setup({ availability: FULL, team: { id: 5, status: 'LOCKED', captain_id: 1, members: [{ id: 1 }], admins: [] } })
      const wrapper = await mountCard()
      expect(cta(wrapper).text()).toContain("YOU'RE REGISTERED")
    })
  })

  describe('request to join', () => {
    const teams = [
      { id: 10, name: 'Open Team', status: 'DRAFT', captain_id: 2, members: [{ id: 2, username: 'x' }] },
      { id: 11, name: 'Full Team', status: 'DRAFT', captain_id: 3, members: [{ id: 3, username: 'y' }, { id: 4, username: 'z' }] },
      { id: 12, name: 'Locked Team', status: 'LOCKED', captain_id: 5, members: [{ id: 5, username: 'w' }] },
    ]

    it('only offers a request for DRAFT teams with room', async () => {
      setup({ teams })
      const wrapper = await mountCard()
      const rows = wrapper.findAll('.team-request-row')
      expect(rows).toHaveLength(1)
      expect(wrapper.findAll('.team-card')[0].text()).toContain('REQUEST TO JOIN')
    })

    it('sends the request, and shows it as pending afterwards', async () => {
      setup({ teams })
      teamsApi.requestToJoin.mockResolvedValue({ id: 99 })
      const wrapper = await mountCard()

      teamsApi.getMyTeam.mockResolvedValue({
        team: null, invitation: null, availability: OPEN, requests: [{ id: 99, team_id: 10 }],
      })
      await wrapper.find('.team-request-row button').trigger('click')
      await flushPromises()

      expect(teamsApi.requestToJoin).toHaveBeenCalledWith(10)
      expect(wrapper.find('.team-request-pending').text()).toBe('Request pending')
    })

    it('does not offer requests to someone who already has a team', async () => {
      setup({ teams, team: { id: 5, status: 'DRAFT', captain_id: 1, members: [{ id: 1 }], admins: [] } })
      const wrapper = await mountCard()
      expect(wrapper.find('.team-request-row').exists()).toBe(false)
    })
  })

  describe('looking-for-team board', () => {
    const lft = [
      { id: 1, userId: 7, tournamentId: 1, note: 'evenings CET', createdAt: '', user: { id: 7, username: 'alice' } },
      { id: 2, userId: 1, tournamentId: 1, note: null, createdAt: '', user: { id: 1, username: 'me' } },
    ]

    it('lists the players with their notes and marks me', async () => {
      setup({ lft })
      const wrapper = await mountCard()
      await openLftTab(wrapper)

      const items = wrapper.findAll('.lft-item')
      expect(items).toHaveLength(2)
      expect(items[0].text()).toContain('@alice')
      expect(items[0].text()).toContain('evenings CET')
      expect(items[1].text()).toContain('YOU')
    })

    it('lets me flag myself with an optional note', async () => {
      setup()
      teamsApi.flagLookingForTeam.mockResolvedValue({})
      const wrapper = await mountCard()
      await openLftTab(wrapper)

      await wrapper.find('.lft-flag input').setValue('support main')
      await wrapper.find('.lft-flag .lft-btn').trigger('click')
      await flushPromises()

      expect(teamsApi.flagLookingForTeam).toHaveBeenCalledWith(1, 'support main')
    })

    it('lets a flagged player take themselves off the board', async () => {
      setup({ lookingForTeam: { id: 2, userId: 1, note: 'support main' } })
      teamsApi.unflagLookingForTeam.mockResolvedValue({ message: 'ok' })
      const wrapper = await mountCard()
      await openLftTab(wrapper)

      await wrapper.find('.lft-flag .lft-btn-ghost').trigger('click')
      await flushPromises()

      expect(teamsApi.unflagLookingForTeam).toHaveBeenCalledWith(1)
    })

    it('lets a captain invite a listed player, but not themselves', async () => {
      setup({
        lft,
        team: { id: 5, status: 'DRAFT', captain_id: 1, members: [{ id: 1 }], admins: [] },
      })
      teamsApi.invitePlayer.mockResolvedValue({})
      const wrapper = await mountCard()
      await openLftTab(wrapper)

      const buttons = wrapper.findAll('.lft-item .lft-btn')
      expect(buttons).toHaveLength(1) // not on my own row
      await buttons[0].trigger('click')
      await flushPromises()

      expect(teamsApi.invitePlayer).toHaveBeenCalledWith(5, { userId: 7 })
      expect(wrapper.find('.lft-item .lft-btn').attributes('disabled')).toBeDefined()
    })

    it('hides invite buttons from non-managers and once the team is locked', async () => {
      setup({ lft, me: 3, team: { id: 5, status: 'DRAFT', captain_id: 1, members: [{ id: 1 }, { id: 3 }], admins: [] } })
      const wrapper = await mountCard()
      await openLftTab(wrapper)
      expect(wrapper.findAll('.lft-item .lft-btn')).toHaveLength(0)
    })

    it('shows an empty state', async () => {
      setup()
      const wrapper = await mountCard()
      await openLftTab(wrapper)
      expect(wrapper.text()).toContain('Nobody is looking for a team right now.')
    })
  })
})
