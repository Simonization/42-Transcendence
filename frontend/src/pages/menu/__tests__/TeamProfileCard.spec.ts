import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { TeamProfile } from '../../../types'

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }))
vi.mock('../../../api/teams', () => ({ teamsApi: { getProfile } }))

import TeamProfileCard from '../TeamProfileCard.vue'

const profile: TeamProfile = {
  id: 1,
  name: 'Alpha',
  status: 'ARCHIVED',
  tournament: { id: 9, name: 'Autumn Cup', status: 'COMPLETED' },
  teamSize: 2,
  maxMembers: 4,
  members: [
    { id: 1, username: 'cap', avatarUrl: null, isCaptain: true, isSubstitute: false },
    { id: 2, username: 'mate', avatarUrl: null, isCaptain: false, isSubstitute: false },
    { id: 3, username: 'bench', avatarUrl: null, isCaptain: false, isSubstitute: true },
  ],
  placement: { place: 2, outcome: 'finalist' },
  podium: { first: 'Charlie', second: 'Alpha', third: ['Bravo'] },
  matches: [
    { id: 1, status: 'FINISHED', stage: 'knockout', round: 1, rounds: 2, opponent: { id: 4, name: 'Delta' }, score: { for: 2, against: 1 }, result: 'W', walkover: false, finishedAt: null },
    { id: 3, status: 'FINISHED', stage: 'knockout', round: 2, rounds: 2, opponent: { id: 3, name: 'Charlie' }, score: { for: 0, against: 2 }, result: 'L', walkover: false, finishedAt: null },
  ],
}

async function mountAt(id = 1) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/menu/teams/:id', component: TeamProfileCard }],
  })
  router.push(`/menu/teams/${id}`)
  await router.isReady()
  const wrapper = mount(TeamProfileCard, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('TeamProfileCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the roster with the captain and a SUB badge on the bench', async () => {
    getProfile.mockResolvedValue(profile)
    const wrapper = await mountAt()

    expect(getProfile).toHaveBeenCalledWith(1)
    const members = wrapper.findAll('.tp-member')
    expect(members).toHaveLength(3)
    expect(members[0].text()).toContain('CAPTAIN')
    expect(members[2].text()).toContain('bench')
    expect(members[2].text()).toContain('SUB')
    expect(members[1].text()).not.toContain('SUB')
  })

  it('lists the results with round, opponent, score and W/L, and the final placement', async () => {
    getProfile.mockResolvedValue(profile)
    const wrapper = await mountAt()

    const rows = wrapper.findAll('[data-testid="match-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('SEMI-FINAL')
    expect(rows[0].text()).toContain('Delta')
    expect(rows[0].text()).toContain('2 - 1')
    expect(rows[0].text()).toContain('W')
    expect(rows[1].text()).toContain('FINAL')
    expect(rows[1].text()).toContain('L')
    expect(wrapper.find('[data-testid="placement"]').text()).toContain('FINALIST')
    expect(wrapper.find('[data-testid="placement"]').text()).toContain('02')
  })

  it('says so when the team cannot be loaded', async () => {
    getProfile.mockRejectedValue(new Error('nope'))
    const wrapper = await mountAt(404)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})
