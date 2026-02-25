/**
 * Admin API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { adminApi } from '../admin'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

const MOCK_USER = {
  id: 2,
  username: 'alice',
  mail: 'alice@test.com',
  role: 1,
  status: 1,
  twoFactorEnabled: false,
}

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsers', () => {
    it('should fetch users with no params', async () => {
      const mockResponse = { users: [MOCK_USER], total: 1 }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await adminApi.getUsers()

      expect(mockApi).toHaveBeenCalledWith('/users')
      expect(result).toEqual(mockResponse)
    })

    it('should fetch users with search query', async () => {
      mockApi.mockResolvedValueOnce({ users: [], total: 0 })

      await adminApi.getUsers({ q: 'alice' })

      expect(mockApi).toHaveBeenCalledWith('/users?q=alice')
    })

    it('should fetch users with pagination', async () => {
      mockApi.mockResolvedValueOnce({ users: [], total: 0 })

      await adminApi.getUsers({ page: 2, limit: 20 })

      const calledUrl = mockApi.mock.calls[0][0] as string
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('limit=20')
    })

    it('should combine search and pagination params', async () => {
      mockApi.mockResolvedValueOnce({ users: [], total: 0 })

      await adminApi.getUsers({ q: 'test', page: 1, limit: 10 })

      const calledUrl = mockApi.mock.calls[0][0] as string
      expect(calledUrl).toContain('q=test')
      expect(calledUrl).toContain('page=1')
      expect(calledUrl).toContain('limit=10')
    })
  })

  describe('updateUser', () => {
    it('should update a user by id', async () => {
      const updatedUser = { ...MOCK_USER, username: 'alice_updated' }
      mockApi.mockResolvedValueOnce(updatedUser)

      const result = await adminApi.updateUser(2, { username: 'alice_updated' })

      expect(mockApi).toHaveBeenCalledWith('/users/2', {
        method: 'PATCH',
        body: { username: 'alice_updated' },
      })
      expect(result).toEqual(updatedUser)
    })

    it('should update user status', async () => {
      mockApi.mockResolvedValueOnce({ ...MOCK_USER, status: 0 })

      await adminApi.updateUser(2, { status: 0 })

      expect(mockApi).toHaveBeenCalledWith('/users/2', {
        method: 'PATCH',
        body: { status: 0 },
      })
    })

    it('should clear avatar by setting avatarUrl to null', async () => {
      mockApi.mockResolvedValueOnce({ ...MOCK_USER, avatarUrl: null })

      await adminApi.updateUser(2, { avatarUrl: null })

      expect(mockApi).toHaveBeenCalledWith('/users/2', {
        method: 'PATCH',
        body: { avatarUrl: null },
      })
    })
  })
})
