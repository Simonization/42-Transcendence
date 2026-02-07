/**
 * Users API Module Unit Tests
 * Tests for user profile and settings management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { usersApi } from '../users'
import * as apiModule from '../index'

// Mock the base API module
vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getMe', () => {
    it('should get current authenticated user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        mail: 'test@test.com',
        twoFactorEnabled: false,
        profile: {
          userId: 1,
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          bio: 'Test bio',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        settings: {
          userId: 1,
          language: 'en' as const,
          timezone: 'UTC',
          theme: 0 as const,
          openMessage: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      }

      mockApi.mockResolvedValueOnce(mockUser)

      const result = await usersApi.getMe()

      expect(mockApi).toHaveBeenCalledWith('/users/me')
      expect(result).toEqual(mockUser)
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData = {
        displayName: 'New Name',
        bio: 'New bio',
      }

      const mockResponse = {
        userId: 1,
        displayName: 'New Name',
        avatarUrl: null,
        bio: 'New bio',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.updateProfile(1, updateData)

      expect(mockApi).toHaveBeenCalledWith('/users/1/profile', {
        method: 'PATCH',
        body: updateData,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should update avatar URL', async () => {
      const updateData = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      }

      const mockResponse = {
        userId: 1,
        displayName: 'Test User',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        bio: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.updateProfile(1, updateData)

      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg')
    })
  })

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const updateData = {
        language: 'fr' as const,
        theme: 2 as const,
      }

      const mockResponse = {
        userId: 1,
        language: 'fr' as const,
        timezone: 'UTC',
        theme: 2 as const,
        openMessage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.updateSettings(1, updateData)

      expect(mockApi).toHaveBeenCalledWith('/users/1/settings', {
        method: 'PATCH',
        body: updateData,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should update timezone', async () => {
      const updateData = {
        timezone: 'America/New_York',
      }

      const mockResponse = {
        userId: 1,
        language: 'en' as const,
        timezone: 'America/New_York',
        theme: 0 as const,
        openMessage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.updateSettings(1, updateData)

      expect(result.timezone).toBe('America/New_York')
    })

    it('should update openMessage setting', async () => {
      const updateData = {
        openMessage: false,
      }

      const mockResponse = {
        userId: 1,
        language: 'en' as const,
        timezone: 'UTC',
        theme: 0 as const,
        openMessage: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.updateSettings(1, updateData)

      expect(result.openMessage).toBe(false)
    })
  })

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const mockResponse = {
        message: 'Account deleted successfully',
      }

      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await usersApi.deleteAccount(1)

      expect(mockApi).toHaveBeenCalledWith('/users/1', {
        method: 'DELETE',
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
