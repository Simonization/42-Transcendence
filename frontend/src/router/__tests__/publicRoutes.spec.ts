/**
 * The real router: /t/:id opens without a token, login-only pages still bounce to /auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api', () => ({ getAccessToken: vi.fn(() => null) }))

import router from '../index'
import { isPublicRoute } from '../publicRoutes'

describe('public routes', () => {
  beforeEach(async () => {
    await router.push('/')
  })

  it('opens the shareable bracket without a login', async () => {
    await router.push('/t/42')
    expect(router.currentRoute.value.name).toBe('public-tournament')
    expect(router.currentRoute.value.params.id).toBe('42')
  })

  it('still sends a logged-out visitor away from the team profile and the brackets menu', async () => {
    await router.push('/menu/teams/3')
    expect(router.currentRoute.value.path).toBe('/auth')
    await router.push('/menu/brackets/3')
    expect(router.currentRoute.value.path).toBe('/auth')
  })

  it('keeps the other public paths public', () => {
    for (const path of ['/', '/auth', '/join/abc', '/t/1', '/privacy']) {
      expect(isPublicRoute({ path })).toBe(true)
    }
    expect(isPublicRoute({ path: '/menu/user' })).toBe(false)
    expect(isPublicRoute({ path: '/menu/t/1' })).toBe(false)
  })
})
