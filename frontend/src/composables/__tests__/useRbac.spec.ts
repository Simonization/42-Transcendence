/**
 * useRbac Composable Tests
 * Validates role-based access control logic for all role states
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import { useRbac } from '../useRbac'
import { UserRole } from '../../types'

describe('useRbac', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to USER role when user is null', () => {
    const authStore = useAuthStore()
    authStore.user = null

    const { userRole, isAdmin, isModerator } = useRbac()

    expect(userRole.value).toBe(UserRole.USER)
    expect(isAdmin.value).toBe(false)
    expect(isModerator.value).toBe(false)
  })

  it('defaults to USER role when role is undefined', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'test',
      mail: 'test@test.com',
      twoFactorEnabled: false,
      profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
      settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
    }

    const { userRole, isAdmin, isModerator } = useRbac()

    expect(userRole.value).toBe(UserRole.USER)
    expect(isAdmin.value).toBe(false)
    expect(isModerator.value).toBe(false)
  })

  it('detects regular user role (0)', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'user',
      mail: 'user@test.com',
      twoFactorEnabled: false,
      role: UserRole.USER,
      profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
      settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
    }

    const { userRole, isAdmin, isModerator, hasRole, canAccess } = useRbac()

    expect(userRole.value).toBe(UserRole.USER)
    expect(isAdmin.value).toBe(false)
    expect(isModerator.value).toBe(false)
    expect(hasRole(UserRole.USER)).toBe(true)
    expect(hasRole(UserRole.ADMIN)).toBe(false)
    expect(canAccess(UserRole.ADMIN)).toBe(false)
  })

  it('detects admin role (1)', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'admin',
      mail: 'admin@test.com',
      twoFactorEnabled: false,
      role: UserRole.ADMIN,
      profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
      settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
    }

    const { userRole, isAdmin, isModerator, hasRole, canAccess } = useRbac()

    expect(userRole.value).toBe(UserRole.ADMIN)
    expect(isAdmin.value).toBe(true)
    expect(isModerator.value).toBe(false)
    expect(hasRole(UserRole.ADMIN)).toBe(true)
    expect(canAccess(UserRole.ADMIN)).toBe(true)
  })

  it('detects moderator role (2)', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'mod',
      mail: 'mod@test.com',
      twoFactorEnabled: false,
      role: UserRole.MODERATOR,
      profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
      settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
    }

    const { userRole, isAdmin, isModerator, hasRole } = useRbac()

    expect(userRole.value).toBe(UserRole.MODERATOR)
    expect(isAdmin.value).toBe(false)
    expect(isModerator.value).toBe(true)
    expect(hasRole(UserRole.MODERATOR)).toBe(true)
  })
})
