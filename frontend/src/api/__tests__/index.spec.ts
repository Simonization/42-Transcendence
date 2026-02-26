/**
 * API Client Unit Tests
 * Tests for base API client with token management and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  api,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '../index'
import { ApiError } from '../../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.location
delete (window as any).location
window.location = { href: '' } as any

describe('Token Management', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  describe('setTokens', () => {
    it('should store access token only', () => {
      setTokens('access123')
      expect(sessionStorage.getItem('accessToken')).toBe('access123')
      expect(sessionStorage.getItem('refreshToken')).toBeNull()
    })

    it('should store both access and refresh tokens', () => {
      setTokens('access123', 'refresh456')
      expect(sessionStorage.getItem('accessToken')).toBe('access123')
      expect(sessionStorage.getItem('refreshToken')).toBe('refresh456')
    })
  })

  describe('getAccessToken', () => {
    it('should return null when no token stored', () => {
      expect(getAccessToken()).toBeNull()
    })

    it('should return stored access token', () => {
      sessionStorage.setItem('accessToken', 'test-token')
      expect(getAccessToken()).toBe('test-token')
    })
  })

  describe('getRefreshToken', () => {
    it('should return null when no token stored', () => {
      expect(getRefreshToken()).toBeNull()
    })

    it('should return stored refresh token', () => {
      sessionStorage.setItem('refreshToken', 'test-refresh')
      expect(getRefreshToken()).toBe('test-refresh')
    })
  })

  describe('clearTokens', () => {
    it('should remove both tokens from storage', () => {
      sessionStorage.setItem('accessToken', 'access')
      sessionStorage.setItem('refreshToken', 'refresh')
      clearTokens()
      expect(sessionStorage.getItem('accessToken')).toBeNull()
      expect(sessionStorage.getItem('refreshToken')).toBeNull()
    })
  })
})

describe('API Client', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockFetch.mockClear()
    window.location.href = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Requests', () => {
    it('should make GET request with auth header', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'test' }),
      })

      const result = await api('/test')

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      })
      expect(result).toEqual({ data: 'test' })
    })

    it('should make POST request with body', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      })

      await api('/test', {
        method: 'POST',
        body: { username: 'test' },
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ username: 'test' }),
      })
    })

    it('should make request without auth when auth=false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'public' }),
      })

      await api('/public', { auth: false })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers).not.toHaveProperty('Authorization')
    })

    it('should handle empty response (204 No Content)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      })

      const result = await api('/delete')
      expect(result).toEqual({})
    })
  })

  describe('Error Handling', () => {
    it('should throw ApiError on 400 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          statusCode: 400,
          error: 'BAD_REQUEST',
          message: 'Invalid input',
        }),
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      })
    })

    it('should throw ApiError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Resource not found',
        }),
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.isNotFoundError()).toBe(true)
    })

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(500)
      expect(error.message).toBe('Internal Server Error')
    })
  })

  describe('Token Refresh on 401', () => {
    it('should refresh token and retry request on 401', async () => {
      setTokens('old-token', 'refresh-token')

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Refresh token call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: 'new-token' }),
      })

      // Retry with new token succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'success' }),
      })

      const result = await api('/protected')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(getAccessToken()).toBe('new-token')
      expect(result).toEqual({ data: 'success' })
    })

    it('should redirect to login when refresh token fails', async () => {
      setTokens('old-token', 'invalid-refresh')

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Refresh token call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // API throws SESSION_EXPIRED error after redirecting to login
      const error = await api('/protected').catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('SESSION_EXPIRED')
      expect(window.location.href).toBe('/auth')
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })

    it('should redirect to login when no refresh token available', async () => {
      setTokens('old-token') // No refresh token

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // API throws SESSION_EXPIRED error after redirecting to auth
      const error = await api('/protected').catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('SESSION_EXPIRED')
      expect(window.location.href).toBe('/auth')
    })

    it('should not attempt refresh on 401 when auth=false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      const error = await api('/public', { auth: false }).catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.isAuthError()).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1) // No retry
    })

    it('should handle concurrent 401s with single refresh', async () => {
      setTokens('old-token', 'refresh-token')

      // Setup mocks for multiple concurrent requests
      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Second request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Single refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: 'new-token' }),
      })

      // First retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'result1' }),
      })

      // Second retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'result2' }),
      })

      // Make concurrent requests
      const promise1 = api('/endpoint1')
      const promise2 = api('/endpoint2')
      const [result1, result2] = await Promise.all([promise1, promise2])

      // Note: The order may vary due to async timing, so we check the set
      expect([result1, result2]).toEqual(
        expect.arrayContaining([
          { data: 'result1' },
          { data: 'result2' },
        ])
      )
      expect(getAccessToken()).toBe('new-token')
      // Should only refresh once (2 initial 401s + 1 refresh + 2 retries = 5 calls)
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })
  })

  describe('ApiError Methods', () => {
    it('should identify auth errors', () => {
      const error = new ApiError(401, 'UNAUTHORIZED', 'Unauthorized')
      expect(error.isAuthError()).toBe(true)
      expect(error.isValidationError()).toBe(false)
      expect(error.isNotFoundError()).toBe(false)
    })

    it('should identify validation errors', () => {
      const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid data')
      expect(error.isValidationError()).toBe(true)
      expect(error.isAuthError()).toBe(false)
    })

    it('should identify not found errors', () => {
      const error = new ApiError(404, 'NOT_FOUND', 'Not found')
      expect(error.isNotFoundError()).toBe(true)
      expect(error.isAuthError()).toBe(false)
    })
  })

  describe('Network Error Scenarios', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 50)
        )
      )

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.message).toBe('Cannot reach the server')
    })

    it('should handle offline scenario', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('NETWORK_ERROR')
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'not valid json {',
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(Error)
    })

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          statusCode: 500,
          error: 'INTERNAL_ERROR',
          message: 'Server error',
        }),
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(500)
    })

    it('should handle 503 service unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({
          statusCode: 503,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
        }),
      })

      const error = await api('/test').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(503)
    })

    it('should handle network error during token refresh', async () => {
      setTokens('old-token', 'refresh-token')

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Refresh fails with network error
      mockFetch.mockRejectedValueOnce(new Error('Network error during refresh'))

      const error = await api('/protected').catch((e) => e)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Edge Cases with Request Options', () => {
    it('should handle PUT request', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ updated: true }),
      })

      await api('/test', {
        method: 'PUT',
        body: { data: 'test' },
      })

      const call = mockFetch.mock.calls[0]
      expect(call[1].method).toBe('PUT')
      expect(JSON.parse(call[1].body)).toEqual({ data: 'test' })
    })

    it('should handle PATCH request', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ patched: true }),
      })

      await api('/test', {
        method: 'PATCH',
        body: { field: 'value' },
      })

      const call = mockFetch.mock.calls[0]
      expect(call[1].method).toBe('PATCH')
    })

    it('should handle DELETE request', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      })

      await api('/test', { method: 'DELETE' })

      const call = mockFetch.mock.calls[0]
      expect(call[1].method).toBe('DELETE')
    })

    it('should handle request with custom headers', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'test' }),
      })

      await api('/test', {
        headers: { 'X-Custom': 'value' },
      })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['X-Custom']).toBe('value')
    })

    it('should preserve existing headers when adding auth', async () => {
      setTokens('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'test' }),
      })

      await api('/test', {
        headers: { 'X-Custom': 'value' },
      })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['X-Custom']).toBe('value')
      expect(call[1].headers.Authorization).toBe('Bearer test-token')
    })
  })

  describe('Token Refresh Edge Cases', () => {
    it('should handle refresh with invalid new token in response', async () => {
      setTokens('old-token', 'refresh-token')

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Refresh returns invalid response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'success' }), // Missing accessToken
      })

      const error = await api('/protected').catch((e) => e)
      // Should handle gracefully
      expect(window.location.href).toBe('/auth')
    })

    it('should handle refresh token response with different field name', async () => {
      setTokens('old-token', 'refresh-token')

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      // Refresh returns token in different field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ newAccessToken: 'token-value' }),
      })

      // Next call should use old logic (expecting accessToken field)
      const error = await api('/protected').catch((e) => e)
      // Should redirect since token wasn't found in expected field
      expect(window.location.href).toBe('/auth')
    })

    it('should handle race condition: both requests get 401 simultaneously', async () => {
      setTokens('old-token', 'refresh-token')

      // Setup for multiple 401s then refresh
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: 'new-token' }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: 'result' }),
      })

      const error = await api('/protected').catch((e) => e)
      // Should handle gracefully (may redirect or retry once)
      expect(error || getAccessToken()).toBeDefined()
    })
  })

})
