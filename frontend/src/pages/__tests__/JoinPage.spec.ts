/**
 * JoinPage Tests — the /join/:code invite link
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { push, replace, route, joinByCode, previewJoinByCode, joinError, checkAuth, getAccessToken } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  route: { params: { code: 'abcDEF2345' }, fullPath: '/join/abcDEF2345' },
  joinByCode: vi.fn(),
  previewJoinByCode: vi.fn(),
  joinError: { value: '' },
  checkAuth: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push, replace }),
}))

vi.mock('../../api', () => ({ getAccessToken }))

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ checkAuth }),
}))

vi.mock('../../composables/useTeams', () => ({
  useTeams: () => ({ joinByCode, previewJoinByCode, error: joinError }),
}))

import JoinPage from '../JoinPage.vue'

const preview = (over: Record<string, unknown> = {}) => ({
  teamName: 'Blues',
  tournamentId: 9,
  tournamentName: 'Autumn Cup',
  memberCount: 1,
  maxMembers: 4,
  blocker: null,
  lockedTeamName: null,
  leaving: [],
  ...over,
})

describe('JoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    sessionStorage.clear()
    joinError.value = ''
    getAccessToken.mockReturnValue('token')
    checkAuth.mockResolvedValue(true)
    previewJoinByCode.mockResolvedValue(preview())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a logged-out visitor to /auth and remembers the link', async () => {
    getAccessToken.mockReturnValue(null)

    mount(JoinPage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/auth')
    expect(sessionStorage.getItem('post_login_redirect')).toBe('/join/abcDEF2345')
    expect(previewJoinByCode).not.toHaveBeenCalled()
    expect(joinByCode).not.toHaveBeenCalled()
  })

  it('treats an expired token like a logged-out visitor', async () => {
    checkAuth.mockResolvedValue(false)

    mount(JoinPage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/auth')
    expect(joinByCode).not.toHaveBeenCalled()
  })

  it('shows the team and tournament and does not join on its own', async () => {
    const wrapper = mount(JoinPage)
    await flushPromises()
    vi.runAllTimers()

    expect(previewJoinByCode).toHaveBeenCalledWith('abcDEF2345')
    expect(wrapper.find('.join-team').text()).toBe('Blues')
    expect(wrapper.find('.join-tournament').text()).toBe('Autumn Cup')
    expect(wrapper.text()).toContain('1 / 4 players')
    expect(joinByCode).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('joins on click, then lands on the team page', async () => {
    joinByCode.mockResolvedValue({ teamId: 5, tournamentId: 9 })

    const wrapper = mount(JoinPage)
    await flushPromises()
    await wrapper.find('.join-confirm').trigger('click')
    await flushPromises()

    expect(joinByCode).toHaveBeenCalledWith('abcDEF2345')
    expect(wrapper.text()).toContain('You joined the team!')

    vi.runAllTimers()
    expect(push).toHaveBeenCalledWith('/menu/tournaments/9/team')
  })

  it('warns before the user leaves a team, hands on a captaincy or deletes a solo team', async () => {
    previewJoinByCode.mockResolvedValue(
      preview({
        leaving: [
          { teamId: 3, teamName: 'Solo', captain: true, deletes: true, successor: null },
          { teamId: 4, teamName: 'Duo', captain: true, deletes: false, successor: 'trinity' },
          { teamId: 6, teamName: 'Guest', captain: false, deletes: false, successor: null },
        ],
      }),
    )

    const wrapper = mount(JoinPage)
    await flushPromises()

    const warning = wrapper.find('.join-warning').text()
    expect(warning).toContain('"Solo" is deleted: you are its only member.')
    expect(warning).toContain('You leave "Duo" and trinity becomes its captain.')
    expect(warning).toContain('You leave "Guest".')
    expect(wrapper.find('.join-confirm').exists()).toBe(true)
  })

  it('explains why the user cannot join and offers no Join button', async () => {
    previewJoinByCode.mockResolvedValue(preview({ blocker: 'locked_elsewhere', lockedTeamName: 'Locked FC' }))

    const wrapper = mount(JoinPage)
    await flushPromises()

    expect(wrapper.find('.join-blocker').text()).toContain('You are registered with "Locked FC" in this tournament.')
    expect(wrapper.find('.join-confirm').exists()).toBe(false)
  })

  it('shows an invalid code as an error and lets the user retry', async () => {
    previewJoinByCode.mockResolvedValueOnce(null)
    joinError.value = 'Invalid join code'

    const wrapper = mount(JoinPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid join code')

    await wrapper.find('.join-btn').trigger('click')
    await flushPromises()

    expect(previewJoinByCode).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.join-team').text()).toBe('Blues')
    expect(joinByCode).not.toHaveBeenCalled()
  })

  it('shows the backend error when the join itself fails', async () => {
    joinByCode.mockResolvedValueOnce(null)
    joinError.value = 'That team is already full (2 players)'

    const wrapper = mount(JoinPage)
    await flushPromises()
    await wrapper.find('.join-confirm').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('That team is already full (2 players)')
    expect(push).not.toHaveBeenCalled()
  })
})
