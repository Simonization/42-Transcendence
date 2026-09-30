/**
 * JoinPage Tests — the /join/:code invite link
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { push, replace, route, joinByCode, joinError, checkAuth, getAccessToken } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  route: { params: { code: 'abcDEF2345' }, fullPath: '/join/abcDEF2345' },
  joinByCode: vi.fn(),
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
  useTeams: () => ({ joinByCode, error: joinError }),
}))

import JoinPage from '../JoinPage.vue'

describe('JoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    sessionStorage.clear()
    joinError.value = ''
    getAccessToken.mockReturnValue('token')
    checkAuth.mockResolvedValue(true)
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
    expect(joinByCode).not.toHaveBeenCalled()
  })

  it('treats an expired token like a logged-out visitor', async () => {
    checkAuth.mockResolvedValue(false)

    mount(JoinPage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/auth')
    expect(joinByCode).not.toHaveBeenCalled()
  })

  it('joins with the code from the URL, then lands on the team page', async () => {
    joinByCode.mockResolvedValue({ teamId: 5, tournamentId: 9 })

    const wrapper = mount(JoinPage)
    await flushPromises()

    expect(joinByCode).toHaveBeenCalledWith('abcDEF2345')
    expect(wrapper.text()).toContain('You joined the team!')

    vi.runAllTimers()
    expect(push).toHaveBeenCalledWith('/menu/tournaments/9/team')
  })

  it('shows the backend error and lets the user retry', async () => {
    joinByCode.mockResolvedValueOnce(null)
    joinError.value = 'That team is already full (2 players)'

    const wrapper = mount(JoinPage)
    await flushPromises()

    expect(wrapper.text()).toContain('That team is already full (2 players)')
    expect(push).not.toHaveBeenCalled()

    joinByCode.mockResolvedValueOnce({ teamId: 5, tournamentId: 9 })
    await wrapper.find('.join-btn').trigger('click')
    await flushPromises()

    expect(joinByCode).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('You joined the team!')
  })
})
