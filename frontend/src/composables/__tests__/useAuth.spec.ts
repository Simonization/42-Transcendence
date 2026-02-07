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

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset modules to get fresh singleton state
    vi.resetModules()
    const mod = await import('../useAuth')
    useAuth = mod.useAuth
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAuth', () => {
    it('should return false when no token is present', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)

      const { checkAuth, isAuthenticated, user } = useAuth()
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

      const { checkAuth, isAuthenticated, user, isLoading } = useAuth()

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

      const { checkAuth, isLoading } = useAuth()

      expect(isLoading.value).toBe(false)

      const promise = checkAuth()
      expect(isLoading.value).toBe(true)

      await promise
      expect(isLoading.value).toBe(false)
    })

    it('should return false when token validation fails', async () => {
      mockGetAccessToken.mockReturnValueOnce('invalid-token')
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'))

      const { checkAuth, isAuthenticated, user } = useAuth()
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

      const { checkAuth, logout, isAuthenticated, user } = useAuth()
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

      const { checkAuth, logout, isAuthenticated, user } = useAuth()
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

      const { logout, isLoading } = useAuth()

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
})
