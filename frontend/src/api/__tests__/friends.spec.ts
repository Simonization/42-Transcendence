/**
 * Friends API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { friendsApi } from '../friends'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Friends API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFriends', () => {
    it('should fetch friends for the authenticated user', async () => {
      const mockFriends = [
        { id: 2, username: 'alice', status: 1, since: '2024-01-01' },
      ]
      mockApi.mockResolvedValueOnce(mockFriends)

      const result = await friendsApi.getFriends()

      expect(mockApi).toHaveBeenCalledWith('/social/friends')
      expect(result).toEqual(mockFriends)
    })
  })

  describe('addFriend', () => {
    it('should send a friend request', async () => {
      const mockFriend = { id: 2, username: 'alice', status: 0 }
      mockApi.mockResolvedValueOnce(mockFriend)

      const result = await friendsApi.addFriend({ friendId: 2 })

      expect(mockApi).toHaveBeenCalledWith('/social/friends', {
        method: 'POST',
        body: { friendId: 2 },
      })
      expect(result).toEqual(mockFriend)
    })
  })

  describe('removeFriend', () => {
    it('should remove a friend', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await friendsApi.removeFriend({ friendId: 2 })

      expect(mockApi).toHaveBeenCalledWith('/social/friends', {
        method: 'DELETE',
        body: { friendId: 2 },
      })
    })
  })

  describe('getBlocked', () => {
    it('should fetch blocked users for the authenticated user', async () => {
      const mockBlocks = [
        { id: 1, blocker: { id: 1 }, blocked: { id: 3, username: 'bob' }, reason: null },
      ]
      mockApi.mockResolvedValueOnce(mockBlocks)

      const result = await friendsApi.getBlocked()

      expect(mockApi).toHaveBeenCalledWith('/social/blocks')
      expect(result).toEqual(mockBlocks)
    })
  })

  describe('blockUser', () => {
    it('should block a user', async () => {
      const mockBlock = { id: 1, blocked: { id: 3 }, reason: 'spam' }
      mockApi.mockResolvedValueOnce(mockBlock)

      const result = await friendsApi.blockUser({ targetId: 3, reason: 'spam' })

      expect(mockApi).toHaveBeenCalledWith('/social/blocks', {
        method: 'POST',
        body: { targetId: 3, reason: 'spam' },
      })
      expect(result).toEqual(mockBlock)
    })

    it('should block a user without reason', async () => {
      mockApi.mockResolvedValueOnce({ id: 1 })

      await friendsApi.blockUser({ targetId: 3 })

      expect(mockApi).toHaveBeenCalledWith('/social/blocks', {
        method: 'POST',
        body: { targetId: 3 },
      })
    })
  })

  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await friendsApi.unblockUser({ targetId: 3 })

      expect(mockApi).toHaveBeenCalledWith('/social/blocks', {
        method: 'DELETE',
        body: { targetId: 3 },
      })
    })
  })
})
