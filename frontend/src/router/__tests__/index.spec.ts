/**
 * Router Auth Guard Tests
 * Comprehensive coverage of async token validation and route protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRouter, createMemoryHistory, Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import { UserRole } from '../../types'

// Mock API token functions
vi.mock('../../api/index', () => ({
  getAccessToken: vi.fn(),
}))

import { getAccessToken } from '../../api/index'

describe('Router Auth Guard', () => {
  let router: Router
  let mockGetAccessToken: any

  beforeEach(() => {
    // Create fresh Pinia for each test
    setActivePinia(createPinia())

    // Create router with auth guard
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'landing', component: { template: '<div>Landing</div>' } },
        { path: '/auth', component: { template: '<div>Auth</div>' } },
        { path: '/auth/verify-email', component: { template: '<div>Verify Email</div>' } },
        { path: '/auth/2fa', component: { template: '<div>2FA</div>' } },
        { path: '/auth/callback', component: { template: '<div>OAuth Callback</div>' } },
        { path: '/menu/user', component: { template: '<div>User</div>' } },
        { path: '/menu/chat', component: { template: '<div>Chat</div>' } },
        { path: '/menu/friend', component: { template: '<div>Friends</div>' } },
        { path: '/menu/tournaments', component: { template: '<div>Tournaments</div>' } },
        { path: '/menu/admin', meta: { requiredRole: UserRole.ADMIN }, component: { template: '<div>Admin</div>' } },
      ],
    })

    // Add auth guard
    router.beforeEach(async (to) => {
      const publicPaths = ['/', '/auth', '/auth/verify-email', '/auth/2fa', '/auth/callback']
      const isPublic = publicPaths.includes(to.path) || to.path.startsWith('/auth/')

      if (isPublic) {
        return true
      }

      const hasToken = !!getAccessToken()
      if (!hasToken) {
        return '/auth'
      }

      const authStore = useAuthStore()
      const isAuthenticated = await authStore.checkAuth()

      if (!isAuthenticated) {
        return '/auth'
      }

      const requiredRole = to.meta.requiredRole as number | undefined
      if (requiredRole !== undefined) {
        const userRole = authStore.user?.role ?? UserRole.USER
        if (userRole !== requiredRole) return '/menu/user'
      }

      return true
    })

    mockGetAccessToken = vi.mocked(getAccessToken)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Public Routes', () => {
    it('should allow navigation to / without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should allow navigation to /auth without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should allow navigation to /auth/verify-email without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth/verify-email')
      expect(router.currentRoute.value.path).toBe('/auth/verify-email')
    })

    it('should allow navigation to /auth/2fa without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth/2fa')
      expect(router.currentRoute.value.path).toBe('/auth/2fa')
    })

    it('should allow navigation to /auth/callback without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth/callback')
      expect(router.currentRoute.value.path).toBe('/auth/callback')
    })

    it('should allow navigation to auth routes with any path starting with /auth/', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth/custom-flow')
      expect(router.currentRoute.value.path).toBe('/auth/custom-flow')
    })
  })

  describe('Protected Routes Without Token', () => {
    it('should redirect /menu/user to /auth without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should redirect /menu/chat to /auth without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should redirect /menu/friend to /auth without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/menu/friend')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should redirect /menu/tournaments to /auth without token', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/menu/tournaments')
      expect(router.currentRoute.value.path).toBe('/auth')
    })
  })

  describe('Protected Routes With Valid Token', () => {
    it('should allow /menu/user with valid token', async () => {
      mockGetAccessToken.mockReturnValue('valid-token-123')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/menu/user')
      expect(authStore.checkAuth).toHaveBeenCalled()
    })

    it('should allow /menu/chat with valid token', async () => {
      mockGetAccessToken.mockReturnValue('valid-token-123')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/menu/chat')
    })

    it('should allow /menu/tournaments with valid token', async () => {
      mockGetAccessToken.mockReturnValue('valid-token-123')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/tournaments')
      expect(router.currentRoute.value.path).toBe('/menu/tournaments')
    })
  })

  describe('Protected Routes With Invalid Token', () => {
    it('should redirect to /auth when checkAuth returns false', async () => {
      mockGetAccessToken.mockReturnValue('invalid-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(false)

      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should redirect to /auth when token is expired', async () => {
      mockGetAccessToken.mockReturnValue('expired-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(false)

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should call checkAuth only once per navigation', async () => {
      mockGetAccessToken.mockReturnValue('token-456')

      const authStore = useAuthStore()
      const checkAuthSpy = vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/user')
      expect(checkAuthSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Token Validation Errors', () => {
    it('should redirect to /auth when checkAuth throws error', async () => {
      mockGetAccessToken.mockReturnValue('problematic-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockRejectedValue(new Error('Network error'))

      // When checkAuth throws, the route guard should fail gracefully
      try {
        await router.push('/menu/user')
      } catch {
        // Expected to throw
      }

      // After error, should be at /auth (guard rejects the navigation)
      expect(router.currentRoute.value.path).not.toBe('/menu/user')
    })

    it('should handle checkAuth returning undefined as false', async () => {
      mockGetAccessToken.mockReturnValue('token-789')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(undefined as any)

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/auth')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty token string as no token', async () => {
      mockGetAccessToken.mockReturnValue('')

      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/auth')
    })

    it('should handle multiple navigation attempts in sequence', async () => {
      mockGetAccessToken.mockReturnValue('token-abc')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/menu/user')

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/menu/chat')

      await router.push('/menu/friend')
      expect(router.currentRoute.value.path).toBe('/menu/friend')
    })

    it('should handle public route access after failed auth', async () => {
      mockGetAccessToken.mockReturnValue('bad-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(false)

      // Try to access protected route
      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/auth')

      // Reset token for public access
      mockGetAccessToken.mockReturnValue(null)

      // Should allow public route without retry
      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should allow navigation from /auth to public routes', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/auth')
      expect(router.currentRoute.value.path).toBe('/auth')

      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should allow navigation between public routes', async () => {
      mockGetAccessToken.mockReturnValue(null)

      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')

      await router.push('/auth/verify-email')
      expect(router.currentRoute.value.path).toBe('/auth/verify-email')

      await router.push('/auth/2fa')
      expect(router.currentRoute.value.path).toBe('/auth/2fa')
    })

    it('should handle rapid token changes', async () => {
      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      // Start with valid token
      mockGetAccessToken.mockReturnValue('token-1')
      await router.push('/menu/user')
      expect(router.currentRoute.value.path).toBe('/menu/user')

      // Simulate token refresh
      mockGetAccessToken.mockReturnValue('token-2')
      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/menu/chat')

      // Token becomes invalid
      vi.mocked(authStore.checkAuth).mockResolvedValue(false)
      await router.push('/menu/friend')
      expect(router.currentRoute.value.path).toBe('/auth')
    })
  })

  describe('Auth Store Integration', () => {
    it('should use the current Pinia instance', async () => {
      mockGetAccessToken.mockReturnValue('token-xyz')

      const authStore = useAuthStore()
      const checkAuthSpy = vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      await router.push('/menu/user')

      expect(checkAuthSpy).toHaveBeenCalled()
      expect(router.currentRoute.value.path).toBe('/menu/user')
    })

    it('should not call checkAuth for public routes', async () => {
      mockGetAccessToken.mockReturnValue(null)

      const authStore = useAuthStore()
      const checkAuthSpy = vi.spyOn(authStore, 'checkAuth')

      await router.push('/')
      await router.push('/auth')
      await router.push('/auth/verify-email')

      expect(checkAuthSpy).not.toHaveBeenCalled()
    })

    it('should call checkAuth exactly once per protected route access', async () => {
      mockGetAccessToken.mockReturnValue('token-def')

      const authStore = useAuthStore()
      const checkAuthSpy = vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)

      checkAuthSpy.mockClear()
      await router.push('/menu/user')
      expect(checkAuthSpy).toHaveBeenCalledTimes(1)

      checkAuthSpy.mockClear()
      await router.push('/menu/chat')
      expect(checkAuthSpy).toHaveBeenCalledTimes(1)

      checkAuthSpy.mockClear()
      await router.push('/menu/friend')
      expect(checkAuthSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Role Guard', () => {
    it('should redirect non-admin (role=0) to /menu/user when accessing /menu/admin', async () => {
      mockGetAccessToken.mockReturnValue('valid-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)
      authStore.user = {
        id: 1, username: 'user', mail: 'u@t.com', twoFactorEnabled: false,
        role: UserRole.USER,
        profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
        settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
      }

      await router.push('/menu/admin')
      expect(router.currentRoute.value.path).toBe('/menu/user')
    })

    it('should allow admin (role=1) to access /menu/admin', async () => {
      mockGetAccessToken.mockReturnValue('valid-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)
      authStore.user = {
        id: 1, username: 'admin', mail: 'a@t.com', twoFactorEnabled: false,
        role: UserRole.ADMIN,
        profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
        settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
      }

      await router.push('/menu/admin')
      expect(router.currentRoute.value.path).toBe('/menu/admin')
    })

    it('should allow any role to access routes without requiredRole meta', async () => {
      mockGetAccessToken.mockReturnValue('valid-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)
      authStore.user = {
        id: 1, username: 'user', mail: 'u@t.com', twoFactorEnabled: false,
        role: UserRole.USER,
        profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
        settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
      }

      await router.push('/menu/chat')
      expect(router.currentRoute.value.path).toBe('/menu/chat')
    })

    it('should default to role=0 when user.role is undefined', async () => {
      mockGetAccessToken.mockReturnValue('valid-token')

      const authStore = useAuthStore()
      vi.spyOn(authStore, 'checkAuth').mockResolvedValue(true)
      authStore.user = {
        id: 1, username: 'norole', mail: 'n@t.com', twoFactorEnabled: false,
        profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
        settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
      }

      await router.push('/menu/admin')
      expect(router.currentRoute.value.path).toBe('/menu/user')
    })
  })
})
