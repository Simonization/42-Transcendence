/**
 * Live brackets: the bracket page joins tournament:<id> and refetches on bracket/tournament
 * events; the admin tournaments tab watches every listed tournament; the match history refetches
 * on match events sent to the user's own room. All of them resync after a reconnect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const { sock, tournamentsApi, matchesApi, router } = vi.hoisted(() => {
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
    router: { push: vi.fn(), replace: vi.fn() },
    tournamentsApi: { getById: vi.fn(), getAll: vi.fn(), getSeeding: vi.fn() },
    matchesApi: { getMyHistory: vi.fn(), openChat: vi.fn() },
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '4' } }),
  useRouter: () => router,
}))
vi.mock('../../../services/socket', () => ({
  onSocketEvent: sock.onSocketEvent,
  subscribeChannel: sock.subscribeChannel,
}))
vi.mock('../../../api/tournaments', () => ({ tournamentsApi }))
vi.mock('../../../api/matches', async (orig) => ({
  ...(await orig<typeof import('../../../api/matches')>()),
  matchesApi,
}))
const fetchTournament = vi.fn()
vi.mock('../../../composables/useTournaments', () => ({
  useTournaments: () => ({
    tournaments: ref([]),
    currentTournament: ref({ id: 4, name: 'Cup', status: 'ONGOING', phases: [], teams: [] }),
    isLoading: ref(false),
    fetchTournament,
    fetchTournaments: vi.fn(),
  }),
}))
vi.mock('../../../components/tournaments/BracketVisualization.vue', () => ({ default: { template: '<div />' } }))

import TournamentBracketsCard from '../TournamentBracketsCard.vue'
import MyTournamentsTab from '../../../components/admin/MyTournamentsTab.vue'
import MatchHistoryCard from '../MatchHistoryCard.vue'
import { useAuthStore } from '../../../stores/auth'
import { RealtimeEvents } from '../../../types/realtime'

const { BRACKET_UPDATED, TOURNAMENT_UPDATED, MATCH_UPDATED } = RealtimeEvents

beforeEach(() => {
  vi.clearAllMocks()
  sock.reset()
  tournamentsApi.getById.mockResolvedValue({ id: 4, name: 'Cup', status: 'ONGOING', phases: [], teams: [] })
  tournamentsApi.getAll.mockResolvedValue([
    { id: 1, name: 'A', status: 'ONGOING', teams: [] },
    { id: 2, name: 'B', status: 'REGISTRATION_OPEN', teams: [] },
  ])
  matchesApi.getMyHistory.mockResolvedValue([])
})

describe('bracket page', () => {
  async function mountPage() {
    const wrapper = mount(TournamentBracketsCard)
    await flushPromises()
    tournamentsApi.getById.mockClear()
    return wrapper
  }

  it('joins tournament:<id>', async () => {
    await mountPage()
    expect(sock.joined).toEqual(['tournament:4'])
  })

  it.each([BRACKET_UPDATED, TOURNAMENT_UPDATED])('refetches the tournament on %s', async (event) => {
    await mountPage()
    sock.fire(event, { id: 4, reason: 'match_finished' })
    await flushPromises()
    expect(tournamentsApi.getById).toHaveBeenCalledWith(4)
  })

  it('ignores events about another tournament', async () => {
    await mountPage()
    sock.fire(BRACKET_UPDATED, { id: 5, reason: 'match_finished' })
    await flushPromises()
    expect(tournamentsApi.getById).not.toHaveBeenCalled()
  })

  it('coalesces a burst into at most two fetches', async () => {
    await mountPage()
    for (let i = 0; i < 5; i++) sock.fire(BRACKET_UPDATED, { id: 4, reason: 'match_finished' })
    await flushPromises()
    expect(tournamentsApi.getById.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('refetches after the socket reconnects, and cleans up on unmount', async () => {
    const wrapper = await mountPage()
    sock.fire('disconnect')
    sock.fire('connect')
    await flushPromises()
    expect(tournamentsApi.getById).toHaveBeenCalledWith(4)

    wrapper.unmount()
    expect(sock.left).toEqual(['tournament:4'])
    expect(sock.listeners(BRACKET_UPDATED)).toBe(0)
  })
})

describe('admin tournaments tab', () => {
  async function mountTab() {
    const wrapper = mount(MyTournamentsTab)
    await flushPromises()
    tournamentsApi.getAll.mockClear()
    return wrapper
  }

  it('joins the room of every listed tournament', async () => {
    await mountTab()
    expect(sock.joined.sort()).toEqual(['tournament:1', 'tournament:2'])
  })

  it('refetches the list quietly when one of them changes', async () => {
    const wrapper = await mountTab()
    sock.fire(TOURNAMENT_UPDATED, { id: 2, reason: 'team_locked' })
    await flushPromises()
    expect(tournamentsApi.getAll).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('A')
  })

  it('refetches on bracket:updated, ignores unlisted tournaments, and resyncs', async () => {
    await mountTab()
    sock.fire(BRACKET_UPDATED, { id: 1, reason: 'tournament_started' })
    await flushPromises()
    expect(tournamentsApi.getAll).toHaveBeenCalledTimes(1)

    tournamentsApi.getAll.mockClear()
    sock.fire(BRACKET_UPDATED, { id: 99, reason: 'tournament_started' })
    await flushPromises()
    expect(tournamentsApi.getAll).not.toHaveBeenCalled()

    sock.fire('disconnect')
    sock.fire('connect')
    await flushPromises()
    expect(tournamentsApi.getAll).toHaveBeenCalledTimes(1)
  })

  it('leaves the rooms of tournaments that disappear, and all of them on unmount', async () => {
    const wrapper = await mountTab()
    tournamentsApi.getAll.mockResolvedValue([{ id: 1, name: 'A', status: 'ONGOING', teams: [] }])
    sock.fire(TOURNAMENT_UPDATED, { id: 2, reason: 'team_deleted' })
    await flushPromises()
    expect(sock.left).toEqual(['tournament:2'])

    wrapper.unmount()
    expect(sock.left.sort()).toEqual(['tournament:1', 'tournament:2'])
  })
})

describe('match history', () => {
  async function mountHistory() {
    useAuthStore().$patch({ user: { id: 1, username: 'me' } as never })
    const wrapper = mount(MatchHistoryCard)
    await flushPromises()
    matchesApi.getMyHistory.mockClear()
    return wrapper
  }

  it('refetches when a match of mine changes on my user room', async () => {
    await mountHistory()
    sock.fire(MATCH_UPDATED, { id: 12, reason: 'match_finished' })
    await flushPromises()
    expect(matchesApi.getMyHistory).toHaveBeenCalledTimes(1)
  })

  it('refetches after the socket reconnects', async () => {
    await mountHistory()
    sock.fire('disconnect')
    sock.fire('connect')
    await flushPromises()
    expect(matchesApi.getMyHistory).toHaveBeenCalledTimes(1)
  })

  it('drops its listener on unmount', async () => {
    const wrapper = await mountHistory()
    expect(sock.listeners(MATCH_UPDATED)).toBe(1)
    wrapper.unmount()
    expect(sock.listeners(MATCH_UPDATED)).toBe(0)
  })
})
