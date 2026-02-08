/**
 * useAuthStore Unit Tests
 * Tests for authentication state management with Pinia
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as usersApiModule from '../../api/users'
import * as authApiModule from '../../api/auth'
import * as apiIndexModule from '../../api/index'

// Mock the API modules
vi.mock('../../api/users', () => ({
  usersApi: {
    getMe: vi.fn(),
  },
}))

vi.mock('../../api/auth', () => ({
  authApi: {
    logout: vi.fn(),
  },
}))

vi.mock('../../api/index', () => ({
  getAccessToken: vi.fn(),
}))

const mockGetMe = vi.mocked(usersApiModule.usersApi.getMe)
const mockLogout = vi.mocked(authApiModule.authApi.logout)
const mockGetAccessToken = vi.mocked(apiIndexModule.getAccessToken)

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('checkAuth', () => {
    it('should return false when no token is present', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)

      const authStore = useAuthStore()
      const result = await authStore.checkAuth()

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      expect(mockGetMe).not.toHaveBeenCalled()
    })

    it('should validate token and set user data on success', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        mail: 'test@test.com',
        twoFactorEnabled: false,
        profile: {
          userId: 1,
          displayName: 'Test User',
          avatarUrl: null,
          bio: null,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        settings: {
          userId: 1,
          language: 'en' as const,
          timezone: null,
          theme: 0 as const,
          openMessage: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      }

      mockGetAccessToken.mockReturnValueOnce('valid-token')
      mockGetMe.mockResolvedValueOnce(mockUser)

      const authStore = useAuthStore()

      expect(authStore.isLoading).toBe(false)

      const result = await authStore.checkAuth()

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.isLoading).toBe(false)
      expect(mockGetMe).toHaveBeenCalled()
    })

    it('should set loading state during validation', async () => {
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({} as any), 100)
          })
      )

      const authStore = useAuthStore()

      expect(authStore.isLoading).toBe(false)

      const promise = authStore.checkAuth()
      expect(authStore.isLoading).toBe(true)

      await promise
      expect(authStore.isLoading).toBe(false)
    })

    it('should return false when token validation fails', async () => {
      mockGetAccessToken.mockReturnValueOnce('invalid-token')
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'))

      const authStore = useAuthStore()
      const result = await authStore.checkAuth()

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })
  })

  describe('logout', () => {
    it('should logout and clear state', async () => {
      mockLogout.mockResolvedValueOnce({ message: 'Logged out' })

      // First authenticate
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce({ id: 1 } as any)

      const authStore = useAuthStore()
      await authStore.checkAuth()

      expect(authStore.isAuthenticated).toBe(true)

      await authStore.logout()

      expect(mockLogout).toHaveBeenCalled()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should clear state even when logout fails', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Network error'))

      // First authenticate
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce({ id: 1 } as any)

      const authStore = useAuthStore()
      await authStore.checkAuth()

      await authStore.logout()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should set loading state during logout', async () => {
      mockLogout.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ message: 'Logged out' }), 100)
          })
      )

      const authStore = useAuthStore()

      expect(authStore.isLoading).toBe(false)

      const promise = authStore.logout()
      expect(authStore.isLoading).toBe(true)

      await promise
      expect(authStore.isLoading).toBe(false)
    })
  })

  describe('store isolation', () => {
    it('should create isolated store instances with Pinia', async () => {
      const mockUser = { id: 1, username: 'test' } as any
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(mockUser)

      const authStore1 = useAuthStore()
      await authStore1.checkAuth()

      // Create a new Pinia instance - should get a fresh store
      setActivePinia(createPinia())
      const authStore2 = useAuthStore()

      // authStore2 should have fresh state
      expect(authStore2.isAuthenticated).toBe(false)
      expect(authStore2.user).toBeNull()
    })
  })
})
