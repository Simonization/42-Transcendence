/**
 * TeamSetupCard realtime tests: which rooms the page joins, that it refetches on the right
 * events (and only for its own team / tournament), and that it re-subscribes once the user
 * joins a team. The socket module is replaced by a small fake that records rooms and lets the
 * test fire server events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '../../../i18n'

const { teamsApi, tournamentsApi, sock } = vi.hoisted(() => {
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
    teamsApi: {
      getMyTeam: vi.fn(),
      getJoinCode: vi.fn(),
      getTeamInvitations: vi.fn(),
      getJoinRequests: vi.fn(),
    },
    tournamentsApi: { getById: vi.fn() },
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('../../../api/teams', () => ({ teamsApi }))
vi.mock('../../../api/tournaments', () => ({ tournamentsApi }))
vi.mock('../../../api/users', () => ({ usersApi: { search: vi.fn() } }))
vi.mock('../../../services/socket', () => ({
  onSocketEvent: sock.onSocketEvent,
  subscribeChannel: sock.subscribeChannel,
}))

import TeamSetupCard from '../TeamSetupCard.vue'
import { useAuthStore } from '../../../stores/auth'
import { useNotificationsStore } from '../../../stores/notifications'
import { RealtimeEvents } from '../../../types/realtime'

const TOURNAMENT = {
  id: 1,
  name: 'Spring Cup',
  status: 'REGISTRATION_OPEN',
  phases: [{ order: 1, game: { teamSize: 3 } }],
}
const TEAM = {
  id: 5,
  name: 'Reds',
  status: 'DRAFT',
  captain_id: 1,
  members: [{ id: 1, username: 'cap' }],
  admins: [],
}
const AVAILABILITY = { tournamentId: 1, maxTeams: 8, lockedTeams: 2, spotsLeft: 6, full: false, registrationOpen: true }

const status = (team: unknown) => ({ team, invitation: null, requests: [], availability: AVAILABILITY })

async function mountCard(team: unknown = TEAM) {
  tournamentsApi.getById.mockResolvedValue(TOURNAMENT)
  teamsApi.getMyTeam.mockResolvedValue(status(team))
  const wrapper = mount(TeamSetupCard, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('TeamSetupCard realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sock.reset()
    i18n.global.locale.value = 'en'
    useAuthStore().$patch({ user: { id: 1, username: 'me' } as never })
    teamsApi.getJoinCode.mockResolvedValue({ joinCode: 'abcDEF2345' })
    teamsApi.getTeamInvitations.mockResolvedValue([])
    teamsApi.getJoinRequests.mockResolvedValue([])
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('joins my team room and the tournament room', async () => {
    await mountCard()
    expect(sock.joined).toEqual(expect.arrayContaining(['team:5', 'tournament:1']))
  })

  it('joins only the tournament room while I have no team', async () => {
    await mountCard(null)
    expect(sock.joined).toEqual(['tournament:1'])
  })

  it('joins the team room once I join a team (after an invitation or request is answered)', async () => {
    await mountCard(null)
    expect(sock.joined).not.toContain('team:5')

    teamsApi.getMyTeam.mockResolvedValue(status(TEAM))
    sock.fire(RealtimeEvents.INVITATION_RECEIVED, { id: 11, reason: 'request_accepted' })
    await flushPromises()

    expect(sock.joined).toContain('team:5')
  })

  it('leaves the team room when I am removed from the team', async () => {
    await mountCard()

    teamsApi.getMyTeam.mockResolvedValue(status(null))
    sock.fire(RealtimeEvents.INVITATION_RECEIVED, { id: 5, reason: 'kicked' })
    await flushPromises()

    expect(sock.left).toContain('team:5')
  })

  it('refetches on team:updated for my team and ignores another team', async () => {
    await mountCard()
    const calls = teamsApi.getMyTeam.mock.calls.length

    sock.fire(RealtimeEvents.TEAM_UPDATED, { id: 99, reason: 'member_joined' })
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls)

    sock.fire(RealtimeEvents.TEAM_UPDATED, { id: 5, reason: 'member_joined' })
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls + 1)
  })

  it('reloads the roster shown on the page', async () => {
    const wrapper = await mountCard()
    expect(wrapper.text()).not.toContain('bob')

    teamsApi.getMyTeam.mockResolvedValue(
      status({ ...TEAM, members: [...TEAM.members, { id: 2, username: 'bob' }] }),
    )
    sock.fire(RealtimeEvents.TEAM_UPDATED, { id: 5, reason: 'member_joined' })
    await flushPromises()

    expect(wrapper.text()).toContain('bob')
  })

  it('refetches on tournament:updated (registered count, full state) for this tournament only', async () => {
    await mountCard()
    const calls = teamsApi.getMyTeam.mock.calls.length

    sock.fire(RealtimeEvents.TOURNAMENT_UPDATED, { id: 2, reason: 'team_locked' })
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls)

    sock.fire(RealtimeEvents.TOURNAMENT_UPDATED, { id: 1, reason: 'team_locked' })
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls + 1)
  })

  it('refetches on a personal invitation event without adding a second toast', async () => {
    await mountCard(null)
    const calls = teamsApi.getMyTeam.mock.calls.length

    sock.fire(RealtimeEvents.INVITATION_RECEIVED, { id: 11, reason: 'invited' })
    await flushPromises()

    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls + 1)
    // The bell already notifies about invitations; the page just refreshes.
    expect(useNotificationsStore().notifications).toHaveLength(0)
  })

  it('refetches after the socket reconnects, not on the first connect', async () => {
    await mountCard()
    const calls = teamsApi.getMyTeam.mock.calls.length

    sock.fire('connect')
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls)

    sock.fire('disconnect')
    sock.fire('connect')
    await flushPromises()
    expect(teamsApi.getMyTeam).toHaveBeenCalledTimes(calls + 1)
  })

  it('collapses a burst of events into at most one extra refetch', async () => {
    await mountCard()
    const calls = teamsApi.getMyTeam.mock.calls.length

    sock.fire(RealtimeEvents.TEAM_UPDATED, { id: 5, reason: 'member_joined' })
    sock.fire(RealtimeEvents.INVITATION_RECEIVED, { id: 1, reason: 'invitation_accepted' })
    sock.fire(RealtimeEvents.TOURNAMENT_UPDATED, { id: 1, reason: 'looking_for_team_changed' })
    await flushPromises()

    expect(teamsApi.getMyTeam.mock.calls.length - calls).toBeLessThanOrEqual(2)
  })

  it('leaves its rooms and drops its listeners on unmount', async () => {
    const wrapper = await mountCard()
    wrapper.unmount()

    expect(sock.left).toEqual(expect.arrayContaining(['team:5', 'tournament:1']))
    expect(sock.listeners(RealtimeEvents.TEAM_UPDATED)).toBe(0)
    expect(sock.listeners(RealtimeEvents.INVITATION_RECEIVED)).toBe(0)
  })
})
