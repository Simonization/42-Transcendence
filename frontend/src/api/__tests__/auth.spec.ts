/**
 * Auth API Module Unit Tests
 * Tests for authentication-related API calls
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { authApi } from '../auth'
import * as apiModule from '../index'

// Mock the base API module
vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)
const mockSetTokens = vi.mocked(apiModule.setTokens)
const mockClearTokens = vi.mocked(apiModule.clearTokens)

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).location
    window.location = { href: '' } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        user: { id: 1, username: 'test', mail: 'test@test.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.login({
        username: 'test',
        password: 'password',
      })

      expect(mockApi).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: { username: 'test', password: 'password' },
        auth: false,
      })
      expect(mockSetTokens).toHaveBeenCalledWith('access-token', 'refresh-token')
      expect(result).toEqual(mockResponse)
    })

    it('should return 2FA required response without storing tokens', async () => {
      const mockResponse = {
        requiresTwoFactor: true,
        userId: 1,
        message: '2FA required',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.login({
        username: 'test',
        password: 'password',
      })

      expect(mockSetTokens).not.toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('register', () => {
    it('should register a new user', async () => {
      const mockResponse = {
        message: 'Registration successful',
        user: {
          id: 1,
          username: 'newuser',
          mail: 'new@test.com',
          isEmailVerified: false,
        },
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.register({
        username: 'newuser',
        mail: 'new@test.com',
        password: 'password123',
      })

      expect(mockApi).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: {
          username: 'newuser',
          mail: 'new@test.com',
          password: 'password123',
        },
        auth: false,
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('logout', () => {
    it('should logout and clear tokens on success', async () => {
      const mockResponse = { message: 'Logged out' }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.logout()

      expect(mockApi).toHaveBeenCalledWith('/auth/logout', {
        method: 'POST',
      })
      expect(mockClearTokens).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('should clear tokens even when logout request fails', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'))

      // logout() returns the response, but always clears tokens even on error
      await authApi.logout().catch(() => {})

      expect(mockClearTokens).toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const mockResponse = { accessToken: 'new-access-token' }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.refresh('refresh-token')

      expect(mockApi).toHaveBeenCalledWith('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'refresh-token' },
        auth: false,
      })
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      const mockResponse = { message: 'Email verified' }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await authApi.verifyEmail('verification-token')

      expect(mockApi).toHaveBeenCalledWith(
        '/auth/verify-email?token=verification-token',
        {
          method: 'GET',
          auth: false,
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should encode special characters in token', async () => {
      const mockResponse = { message: 'Email verified' }
      mockApi.mockResolvedValueOnce(mockResponse)

      await authApi.verifyEmail('token+with/special=chars')

      expect(mockApi).toHaveBeenCalledWith(
        '/auth/verify-email?token=token%2Bwith%2Fspecial%3Dchars',
        {
          method: 'GET',
          auth: false,
        }
      )
    })
  })

  describe('2FA Methods', () => {
    describe('enable2FA', () => {
      it('should request 2FA enablement', async () => {
        const mockResponse = { message: 'Code sent to email' }
        mockApi.mockResolvedValueOnce(mockResponse)

        const result = await authApi.enable2FA()

        expect(mockApi).toHaveBeenCalledWith('/auth/2fa/enable', {
          method: 'POST',
        })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('confirm2FA', () => {
      it('should confirm 2FA setup with code', async () => {
        const mockResponse = { message: '2FA enabled' }
        mockApi.mockResolvedValueOnce(mockResponse)

        const result = await authApi.confirm2FA({ code: '123456' })

        expect(mockApi).toHaveBeenCalledWith('/auth/2fa/confirm', {
          method: 'POST',
          body: { code: '123456' },
        })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('verify2FA', () => {
      it('should verify 2FA code and store tokens', async () => {
        const mockResponse = {
          user: { id: 1, username: 'test', mail: 'test@test.com' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }
        mockApi.mockResolvedValueOnce(mockResponse)

        const result = await authApi.verify2FA({ userId: 1, code: '123456' })

        expect(mockApi).toHaveBeenCalledWith('/auth/2fa/verify', {
          method: 'POST',
          body: { userId: 1, code: '123456' },
          auth: false,
        })
        expect(mockSetTokens).toHaveBeenCalledWith('access-token', 'refresh-token')
        expect(result).toEqual(mockResponse)
      })
    })

    describe('disable2FA', () => {
      it('should disable 2FA', async () => {
        const mockResponse = { message: '2FA disabled' }
        mockApi.mockResolvedValueOnce(mockResponse)

        const result = await authApi.disable2FA()

        expect(mockApi).toHaveBeenCalledWith('/auth/2fa/disable', {
          method: 'POST',
        })
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('OAuth Methods', () => {
    describe('googleLogin', () => {
      it('should redirect to Google OAuth', () => {
        authApi.googleLogin()

        expect(window.location.href).toBe('/api/auth/google')
      })
    })

    describe('handleOAuthCallback', () => {
      it('should store OAuth callback tokens', () => {
        authApi.handleOAuthCallback('oauth-access', 'oauth-refresh')

        expect(mockSetTokens).toHaveBeenCalledWith('oauth-access', 'oauth-refresh')
      })
    })
  })
})
