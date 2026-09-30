/**
 * The match chat button: shown in the expanded match card to members of either team only (the
 * visualization decides, the card renders), and asks the page to open the room.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketVisualization from '../BracketVisualization.vue'
import BracketMatchCard from '../BracketMatchCard.vue'
import { buildBracket } from '../../../utils/bracket'
import { useAuthStore } from '../../../stores/auth'
import { PhaseType, TeamStatus, TournamentStatus } from '../../../types'
import type { BackendTeam, BackendTournament } from '../../../types'

vi.mock('../../../api/matches', () => ({ matchesApi: {} }))
vi.mock('../../../api/tournaments', () => ({ tournamentsApi: {} }))

const team = (id: number): BackendTeam =>
  ({
    id,
    name: `T${id}`,
    status: TeamStatus.LOCKED,
    captain_id: 100 + id,
    members: [{ id: 100 + id, username: `p${id}` }],
    admins: [],
  }) as BackendTeam

function bracketWith(status: string) {
  const tournament = {
    id: 1,
    name: 'Cup',
    status: TournamentStatus.ONGOING,
    teams: [team(1), team(2)],
    phases: [
      {
        id: 1,
        order: 1,
        type: PhaseType.SINGLE_ELIMINATION,
        matches: [
          {
            id: 7,
            phase_id: 1,
            round_order: 1,
            status,
            team1_id: 1,
            team2_id: 2,
            team1_score: null,
            team2_score: null,
            winner_id: null,
            score: null,
            created_at: '2026-09-02T00:00:00Z',
          },
        ],
      },
    ],
    createdAt: '2026-09-01T00:00:00Z',
  } as unknown as BackendTournament
  return buildBracket(tournament)!
}

async function mountViz(userId: number, status = 'READY', interactive = true) {
  useAuthStore().$patch({ user: { id: userId, username: 'me' } as never })
  const wrapper = mount(BracketVisualization, {
    props: { bracket: bracketWith(status), tournamentStatus: 'ONGOING', interactive },
    global: { stubs: { ConfirmDialog: true } },
  })
  await wrapper.find('.match-card').trigger('click')
  return wrapper
}

const chatButton = (w: ReturnType<typeof mount>) =>
  w.findAll('button').find(b => b.text() === 'Match chat')

describe('match chat button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows for a member of either team', async () => {
    expect(chatButton(await mountViz(101))).toBeTruthy()
    expect(chatButton(await mountViz(102))).toBeTruthy()
  })

  it('does not show for someone on neither team', async () => {
    expect(chatButton(await mountViz(999))).toBeUndefined()
  })

  it('does not show on a read-only bracket', async () => {
    expect(chatButton(await mountViz(101, 'READY', false))).toBeUndefined()
  })

  it('does not show while the match is waiting for its opponent', async () => {
    expect(chatButton(await mountViz(101, 'WAITING'))).toBeUndefined()
  })

  it('asks the page to open the chat of that match', async () => {
    const wrapper = await mountViz(101)
    await chatButton(wrapper)!.trigger('click')
    expect(wrapper.emitted('open-chat')).toEqual([[7]])
  })
})

describe('BracketMatchCard', () => {
  const match = bracketWith('READY').rounds[0].matches[0]
  const none = { report: false, confirm: false, dispute: false, resolve: false, undo: false, withdraw: false }

  it('renders the button only when canChat is set, even without other actions', async () => {
    const off = mount(BracketMatchCard, { props: { match, expanded: true, permissions: none } })
    expect(off.text()).not.toContain('Match chat')

    const on = mount(BracketMatchCard, { props: { match, expanded: true, permissions: none, canChat: true } })
    await on.findAll('button').find(b => b.text() === 'Match chat')!.trigger('click')
    expect(on.emitted('open-chat')).toHaveLength(1)
  })
})
