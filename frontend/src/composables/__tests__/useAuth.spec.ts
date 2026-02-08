/**
 * useAuth Composable Unit Tests
 * Tests for authentication state management (singleton pattern)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// We need to re-import the module fresh for each test to reset singleton state
// Since the refs are module-level, we use vi.resetModules()

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

describe('useAuth', () => {
  let useAuth: typeof import('../useAuth').useAuth
  let checkAuth: any
  let logout: any
  let isAuthenticated: any
  let user: any
  let isLoading: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset modules to get fresh singleton state
    vi.resetModules()
    const mod = await import('../useAuth')
    useAuth = mod.useAuth
    const { checkAuth: ca, logout: lo } = useAuth()
    checkAuth = ca
    logout = lo
    isAuthenticated = (useAuth() as any).isAuthenticated
    user = (useAuth() as any).user
    isLoading = (useAuth() as any).isLoading
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAuth', () => {
    it('should return false when no token is present', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)

      const result = await checkAuth()

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
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

      expect(isLoading.value).toBe(false)

      const result = await checkAuth()

      expect(result).toBe(true)
      expect(isAuthenticated.value).toBe(true)
      expect(user.value).toEqual(mockUser)
      expect(isLoading.value).toBe(false)
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

      expect(isLoading.value).toBe(false)

      const promise = checkAuth()
      expect(isLoading.value).toBe(true)

      await promise
      expect(isLoading.value).toBe(false)
    })

    it('should return false when token validation fails', async () => {
      mockGetAccessToken.mockReturnValueOnce('invalid-token')
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'))

      const result = await checkAuth()

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })
  })

  describe('logout', () => {
    it('should logout and clear state', async () => {
      mockLogout.mockResolvedValueOnce({ message: 'Logged out' })

      // First authenticate
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce({ id: 1 } as any)

      await checkAuth()

      expect(isAuthenticated.value).toBe(true)

      await logout()

      expect(mockLogout).toHaveBeenCalled()
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should clear state even when logout fails', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Network error'))

      // First authenticate
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce({ id: 1 } as any)

      await checkAuth()

      await logout()

      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should set loading state during logout', async () => {
      mockLogout.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ message: 'Logged out' }), 100)
          })
      )

      expect(isLoading.value).toBe(false)

      const promise = logout()
      expect(isLoading.value).toBe(true)

      await promise
      expect(isLoading.value).toBe(false)
    })
  })

  describe('singleton behavior', () => {
    it('should share state between multiple calls', async () => {
      const mockUser = { id: 1, username: 'test' } as any
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(mockUser)

      const auth1 = useAuth()
      const auth2 = useAuth()

      await auth1.checkAuth()

      // Both instances should see the same state
      expect(auth2.isAuthenticated.value).toBe(true)
      expect(auth2.user.value).toEqual(mockUser)
    })
  })

  describe('Edge Cases', () => {
    it('should handle API error with invalid user object', async () => {
      const invalidUser = { id: 1, username: 'test' } // Missing required fields
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(invalidUser as any)

      const result = await checkAuth()

      // Should still set user even with incomplete data (API contract responsibility)
      expect(result).toBe(true)
      expect(user.value).toEqual(invalidUser)
    })

    it('should handle getMe API error without crashing', async () => {
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockRejectedValueOnce({
        status: 500,
        message: 'Internal Server Error',
      })

      const result = await checkAuth()

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should handle concurrent checkAuth calls', async () => {
      const mockUser = { id: 1, username: 'test' } as any
      mockGetAccessToken.mockReturnValue('token')
      mockGetMe.mockResolvedValue(mockUser)

      // Make multiple concurrent calls
      const [result1, result2, result3] = await Promise.all([
        checkAuth(),
        checkAuth(),
        checkAuth(),
      ])

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
      expect(isAuthenticated.value).toBe(true)
      expect(user.value).toEqual(mockUser)
      // All should call getMe (no deduplication)
      expect(mockGetMe).toHaveBeenCalledTimes(3)
    })

    it('should clear state when checkAuth called multiple times with token then without', async () => {
      const mockUser = { id: 1, username: 'test' } as any

      // First call with token
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(mockUser)
      await checkAuth()
      expect(isAuthenticated.value).toBe(true)

      // Second call without token
      mockGetAccessToken.mockReturnValueOnce(null)
      const result = await checkAuth()

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should reset isLoading on error', async () => {
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockRejectedValueOnce(new Error('Request failed'))

      expect(isLoading.value).toBe(false)
      const promise = checkAuth()
      expect(isLoading.value).toBe(true)

      await promise

      expect(isLoading.value).toBe(false)
    })

    it('should handle logout when not authenticated', async () => {
      mockLogout.mockResolvedValueOnce({ message: 'Logged out' })

      // Don't authenticate first
      expect(isAuthenticated.value).toBe(false)

      await logout()

      expect(mockLogout).toHaveBeenCalled()
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should handle logout API error without throwing', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await logout()

      // Should not throw
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should handle logout with API error object', async () => {
      mockLogout.mockRejectedValueOnce({
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'Session expired',
      })

      await logout()

      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should preserve state across multiple logouts', async () => {
      const mockUser = { id: 1, username: 'test' } as any
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(mockUser)
      mockLogout.mockResolvedValue({ message: 'Logged out' })

      await checkAuth()
      expect(isAuthenticated.value).toBe(true)

      await logout()
      expect(isAuthenticated.value).toBe(false)

      // Second logout should still work
      await logout()
      expect(isAuthenticated.value).toBe(false)
    })

    it('should handle immediate error after success', async () => {
      const mockUser = { id: 1, username: 'test' } as any

      // First successful auth
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockResolvedValueOnce(mockUser)
      await checkAuth()
      expect(isAuthenticated.value).toBe(true)

      // Second call with error
      mockGetAccessToken.mockReturnValueOnce('token')
      mockGetMe.mockRejectedValueOnce(new Error('Session expired'))
      const result = await checkAuth()

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })
  })
})
