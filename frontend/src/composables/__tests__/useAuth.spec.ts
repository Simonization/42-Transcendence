/**
 * useAuth Composable Unit Tests
 * Tests for authentication state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAuth } from '../useAuth'
import * as usersApiModule from '../../api/users'
import * as authApiModule from '../../api/auth'
import * as apiIndexModule from '../../api/index'

// Mock the router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
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
    it('should logout and redirect to login page', async () => {
      mockLogout.mockResolvedValueOnce({ message: 'Logged out' })

      const { logout, isAuthenticated, user } = useAuth()

      // Set some state first
      isAuthenticated.value = true
      user.value = { id: 1 } as any

      await logout()

      expect(mockLogout).toHaveBeenCalled()
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should clear state and redirect even when logout fails', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Network error'))

      const { logout, isAuthenticated, user } = useAuth()

      // Set some state first
      isAuthenticated.value = true
      user.value = { id: 1 } as any

      await logout()

      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/login')
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
})
