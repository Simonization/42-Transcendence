/**
 * TournamentDetailCard realtime tests: joins tournament:<id>, refetches the tournament, my team
 * state and the looking-for-team board on tournament:updated, and refetches after a reconnect.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const { teamsApi, fetchTournament, sock } = vi.hoisted(() => {
  type Fn = (payload?: unknown) => void
  const handlers = new Map<string, Set<Fn>>()
  const sock = {
    joined: [] as string[],
    left: [] as string[],
    fire(event: string, payload?: unknown) {
      handlers.get(event)?.forEach((fn) => fn(payload))
    },
    listeners: (event: string) => handlers.get(event)?.size ?? 0,
    reset() {
      handlers.clear()
      sock.joined.length = 0
      sock.left.length = 0
    },
    onSocketEvent(event: string, fn: Fn) {
      const set = handlers.get(event) ?? new Set<Fn>()
      set.add(fn)
      handlers.set(event, set)
      return () => set.delete(fn)
    },
    subscribeChannel(channel: string, id: number) {
      const room = `${channel}:${id}`
      sock.joined.push(room)
      return () => sock.left.push(room)
    },
  }
  return {
    sock,
    fetchTournament: vi.fn(),
    teamsApi: {
      getMyTeam: vi.fn(),
      getLookingForTeam: vi.fn(),
    },
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('../../../api/teams', () => ({ teamsApi }))
vi.mock('../../../services/socket', () => ({
  onSocketEvent: sock.onSocketEvent,
  subscribeChannel: sock.subscribeChannel,
}))
vi.mock('../../../composables/useTournaments', () => ({
  useTournaments: () => ({
    currentTournament: ref({
      id: 1,
      name: 'Spring Cup',
      description: '',
      max_participants: 2,
      status: 'REGISTRATION_OPEN',
      createdAt: '2026-09-01T00:00:00Z',
      phases: [{ id: 1, order: 1, type: 'SINGLE_ELIMINATION', game: { name: 'Pong', teamSize: 2 }, matches: [] }],
      teams: [],
    }),
    isLoading: ref(false),
    error: ref(''),
    fetchTournament,
    register: vi.fn(),
  }),
}))
vi.mock('../../../components/tournaments/BracketVisualization.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('../../../components/tournaments/TournamentRegistrationModal.vue', () => ({
  default: { template: '<div />' },
}))

import TournamentDetailCard from '../TournamentDetailCard.vue'
import { useAuthStore } from '../../../stores/auth'
import { RealtimeEvents } from '../../../types/realtime'

const OPEN = { tournamentId: 1, maxTeams: 2, lockedTeams: 0, spotsLeft: 2, full: false, registrationOpen: true }

async function mountCard() {
  const wrapper = mount(TournamentDetailCard)
  await flushPromises()
  return wrapper
}

describe('TournamentDetailCard realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sock.reset()
    useAuthStore().$patch({ user: { id: 1, username: 'me' } as never })
    teamsApi.getMyTeam.mockResolvedValue({ team: null, invitation: null, requests: [], availability: OPEN, lookingForTeam: null })
    teamsApi.getLookingForTeam.mockResolvedValue([])
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('joins tournament:<id>', async () => {
    await mountCard()
    expect(sock.joined).toEqual(['tournament:1'])
  })

  it('refetches the tournament, my team state and the LFT board on tournament:updated', async () => {
    await mountCard()
    vi.clearAllMocks()

    sock.fire(RealtimeEvents.TOURNAMENT_UPDATED, { id: 1, reason: 'team_locked' })
    await flushPromises()

    expect(fetchTournament).toHaveBeenCalledWith(1)
    expect(teamsApi.getMyTeam).toHaveBeenCalledWith(1)
    expect(teamsApi.getLookingForTeam).toHaveBeenCalledWith(1)
  })

  it('ignores events about another tournament', async () => {
    await mountCard()
    vi.clearAllMocks()

    sock.fire(RealtimeEvents.TOURNAMENT_UPDATED, { id: 2, reason: 'team_locked' })
    await flushPromises()

    expect(fetchTournament).not.toHaveBeenCalled()
    expect(teamsApi.getLookingForTeam).not.toHaveBeenCalled()
  })

  it('refreshes only my team state when a personal invitation event arrives', async () => {
    await mountCard()
    vi.clearAllMocks()

    sock.fire(RealtimeEvents.INVITATION_RECEIVED, { id: 11, reason: 'request_accepted' })
    await flushPromises()

    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(1)
    expect(fetchTournament).not.toHaveBeenCalled()
  })

  it('refetches after the socket reconnects', async () => {
    await mountCard()
    vi.clearAllMocks()

    sock.fire('disconnect')
    sock.fire('connect')
    await flushPromises()

    expect(fetchTournament).toHaveBeenCalledWith(1)
    expect(teamsApi.getLookingForTeam).toHaveBeenCalledWith(1)
  })

  it('leaves the room and drops its listeners on unmount', async () => {
    const wrapper = await mountCard()
    wrapper.unmount()

    expect(sock.left).toEqual(['tournament:1'])
    expect(sock.listeners(RealtimeEvents.TOURNAMENT_UPDATED)).toBe(0)
    expect(sock.listeners(RealtimeEvents.INVITATION_RECEIVED)).toBe(0)
  })
})
