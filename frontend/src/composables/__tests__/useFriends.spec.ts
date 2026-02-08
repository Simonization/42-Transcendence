/**
 * useFriends Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as friendsApiModule from '../../api/friends'

vi.mock('../../api/friends', () => ({
  friendsApi: {
    getFriends: vi.fn(),
    addFriend: vi.fn(),
    removeFriend: vi.fn(),
    getBlocked: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  },
}))

const mockGetFriends = vi.mocked(friendsApiModule.friendsApi.getFriends)
const mockAddFriend = vi.mocked(friendsApiModule.friendsApi.addFriend)
const mockRemoveFriend = vi.mocked(friendsApiModule.friendsApi.removeFriend)
const mockGetBlocked = vi.mocked(friendsApiModule.friendsApi.getBlocked)
const mockBlockUser = vi.mocked(friendsApiModule.friendsApi.blockUser)
const mockUnblockUser = vi.mocked(friendsApiModule.friendsApi.unblockUser)

describe('useFriends', () => {
  let useFriends: typeof import('../useFriends').useFriends
  let fetchFriends: any
  let fetchBlocks: any
  let addFriend: any
  let removeFriend: any
  let blockUser: any
  let unblockUser: any
  let friends: any
  let blocks: any
  let isLoading: any
  let error: any
  let acceptedFriends: any
  let pendingFriends: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../useFriends')
    useFriends = mod.useFriends
    const instance = useFriends()
    fetchFriends = instance.fetchFriends
    fetchBlocks = instance.fetchBlocks
    addFriend = instance.addFriend
    removeFriend = instance.removeFriend
    blockUser = instance.blockUser
    unblockUser = instance.unblockUser
    friends = instance.friends
    blocks = instance.blocks
    isLoading = instance.isLoading
    error = instance.error
    acceptedFriends = instance.acceptedFriends
    pendingFriends = instance.pendingFriends
  })

  describe('fetchFriends', () => {
    it('should load friends list', async () => {
      const mockFriends = [
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
      ]
      mockGetFriends.mockResolvedValueOnce(mockFriends as any)

      await fetchFriends(1)

      expect(mockGetFriends).toHaveBeenCalledWith(1)
      expect(friends.value).toEqual(mockFriends)
      expect(isLoading.value).toBe(false)
    })

    it('should set error on failure', async () => {
      mockGetFriends.mockRejectedValueOnce(new Error('Network error'))

      await fetchFriends(1)

      expect(error.value).toBe('Failed to load friends')
    })
  })

  describe('fetchBlocks', () => {
    it('should load blocked users', async () => {
      const mockBlocks = [
        { id: 1, blocker: { id: 1 }, blocked: { id: 3, username: 'bob' }, reason: null },
      ]
      mockGetBlocked.mockResolvedValueOnce(mockBlocks as any)

      
      await fetchBlocks(1)

      expect(blocks.value).toEqual(mockBlocks)
    })
  })

  describe('addFriend', () => {
    it('should add a friend and return true', async () => {
      mockAddFriend.mockResolvedValueOnce({} as any)

      
      const result = await addFriend(2)

      expect(result).toBe(true)
      expect(mockAddFriend).toHaveBeenCalledWith({ friendId: 2 })
    })

    it('should return false on error', async () => {
      mockAddFriend.mockRejectedValueOnce(new Error('fail'))

      
      const result = await addFriend(2)

      expect(result).toBe(false)
      expect(error.value).toBe('Failed to add friend')
    })
  })

  describe('removeFriend', () => {
    it('should remove friend from local list', async () => {
      const mockFriends = [
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
        { id: 3, username: 'bob', status: 1, since: '2024-01-01', profile: {} },
      ]
      mockGetFriends.mockResolvedValueOnce(mockFriends as any)
      mockRemoveFriend.mockResolvedValueOnce(undefined)

      await fetchFriends(1)
      expect(friends.value).toHaveLength(2)

      await removeFriend(2)
      expect(friends.value).toHaveLength(1)
      expect(friends.value[0].id).toBe(3)
    })
  })

  describe('blockUser', () => {
    it('should add to blocks and remove from friends', async () => {
      const mockBlock = { id: 1, blocker: { id: 1 }, blocked: { id: 2, username: 'alice' }, reason: null }
      mockBlockUser.mockResolvedValueOnce(mockBlock as any)
      mockGetFriends.mockResolvedValueOnce([
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
      ] as any)

      await fetchFriends(1)
      expect(friends.value).toHaveLength(1)

      await blockUser(2)
      expect(blocks.value).toHaveLength(1)
      expect(friends.value).toHaveLength(0)
    })
  })

  describe('unblockUser', () => {
    it('should remove from blocks list', async () => {
      mockGetBlocked.mockResolvedValueOnce([
        { id: 1, blocker: { id: 1 }, blocked: { id: 3, username: 'bob' }, reason: null },
      ] as any)
      mockUnblockUser.mockResolvedValueOnce(undefined)

      
      await fetchBlocks(1)
      expect(blocks.value).toHaveLength(1)

      await unblockUser(3)
      expect(blocks.value).toHaveLength(0)
    })
  })

  describe('computed', () => {
    it('should filter accepted and pending friends', async () => {
      mockGetFriends.mockResolvedValueOnce([
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
        { id: 3, username: 'bob', status: 0, since: '2024-01-01', profile: {} },
        { id: 4, username: 'carol', status: 1, since: '2024-01-01', profile: {} },
      ] as any)

      await fetchFriends(1)

      expect(acceptedFriends.value).toHaveLength(2)
      expect(pendingFriends.value).toHaveLength(1)
      expect(pendingFriends.value[0].username).toBe('bob')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty friends list', async () => {
      mockGetFriends.mockResolvedValueOnce([] as any)

      await fetchFriends(1)

      expect(friends.value).toHaveLength(0)
      expect(acceptedFriends.value).toHaveLength(0)
      expect(pendingFriends.value).toHaveLength(0)
      expect(error.value).toBe('')
    })

    it('should handle empty blocks list', async () => {
      mockGetBlocked.mockResolvedValueOnce([] as any)

      await fetchBlocks(1)

      expect(blocks.value).toHaveLength(0)
      expect(error.value).toBe('')
    })

    it('should handle network error on fetchFriends', async () => {
      mockGetFriends.mockRejectedValueOnce(new Error('Network timeout'))

      await fetchFriends(1)

      expect(error.value).toBe('Failed to load friends')
      expect(friends.value).toHaveLength(0)
      expect(isLoading.value).toBe(false)
    })

    it('should handle network error on fetchBlocks', async () => {
      mockGetBlocked.mockRejectedValueOnce(new Error('Network timeout'))

      await fetchBlocks(1)

      expect(error.value).toBe('Failed to load blocks')
      expect(blocks.value).toHaveLength(0)
    })

    it('should handle already-friend add attempt', async () => {
      mockAddFriend.mockRejectedValueOnce({
        status: 400,
        code: 'ALREADY_FRIEND',
        message: 'Already friends',
      })

      const result = await addFriend(2)

      expect(result).toBe(false)
      expect(error.value).toContain('Failed to add friend')
    })

    it('should handle remove non-existent friend', async () => {
      // Start with empty friends list
      expect(friends.value).toHaveLength(0)

      mockRemoveFriend.mockResolvedValueOnce(undefined)
      const result = await removeFriend(999)

      expect(result).toBe(true)
      expect(friends.value).toHaveLength(0)
    })

    it('should handle remove from large friend list', async () => {
      const largeList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        username: `user${i}`,
        status: 1,
        since: '2024-01-01',
        profile: {},
      }))

      mockGetFriends.mockResolvedValueOnce(largeList as any)
      mockRemoveFriend.mockResolvedValueOnce(undefined)

      await fetchFriends(1)
      expect(friends.value).toHaveLength(100)

      await removeFriend(50)

      expect(friends.value).toHaveLength(99)
      expect(friends.value.find((f) => f.id === 50)).toBeUndefined()
    })

    it('should handle block user with reason', async () => {
      const mockBlock = {
        id: 1,
        blocker: { id: 1 },
        blocked: { id: 2, username: 'alice' },
        reason: 'Spam',
      }
      mockBlockUser.mockResolvedValueOnce(mockBlock as any)
      mockGetFriends.mockResolvedValueOnce([
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
      ] as any)

      await fetchFriends(1)
      const result = await blockUser(2, 'Spam')

      expect(result).toBe(true)
      expect(blocks.value).toHaveLength(1)
      expect(blocks.value[0]).toEqual(mockBlock)
      expect(friends.value).toHaveLength(0)
    })

    it('should handle block already-blocked user', async () => {
      mockBlockUser.mockRejectedValueOnce({
        status: 400,
        code: 'ALREADY_BLOCKED',
        message: 'Already blocked',
      })

      const result = await blockUser(2, 'Spam')

      expect(result).toBe(false)
      expect(error.value).toContain('Failed to block user')
    })

    it('should handle unblock non-existent user', async () => {
      // Start with empty blocks list
      expect(blocks.value).toHaveLength(0)

      mockUnblockUser.mockResolvedValueOnce(undefined)
      const result = await unblockUser(999)

      expect(result).toBe(true)
      expect(blocks.value).toHaveLength(0)
    })

    it('should handle concurrent friend operations', async () => {
      mockAddFriend.mockResolvedValue({} as any)

      const [result1, result2, result3] = await Promise.all([
        addFriend(2),
        addFriend(3),
        addFriend(4),
      ])

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
      expect(mockAddFriend).toHaveBeenCalledTimes(3)
    })

    it('should clear error after successful operation', async () => {
      mockAddFriend.mockRejectedValueOnce(new Error('Network error'))
      await addFriend(2)
      expect(error.value).not.toBe('')

      mockAddFriend.mockResolvedValueOnce({} as any)
      await addFriend(3)

      expect(error.value).toBe('')
    })

    it('should handle remove and add same friend', async () => {
      mockGetFriends.mockResolvedValue([
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
      ] as any)
      mockRemoveFriend.mockResolvedValue(undefined)
      mockAddFriend.mockResolvedValue({} as any)

      await fetchFriends(1)
      expect(friends.value).toHaveLength(1)

      await removeFriend(2)
      expect(friends.value).toHaveLength(0)

      await addFriend(2)
      expect(error.value).toBe('')
    })

    it('should update acceptedFriends after adding friend', async () => {
      const friend = { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} }
      mockGetFriends.mockResolvedValueOnce([friend] as any)

      await fetchFriends(1)
      expect(acceptedFriends.value).toHaveLength(1)
      expect(pendingFriends.value).toHaveLength(0)
    })

    it('should handle block user not in friends list', async () => {
      const mockBlock = {
        id: 1,
        blocker: { id: 1 },
        blocked: { id: 5, username: 'eve' },
        reason: null,
      }
      mockBlockUser.mockResolvedValueOnce(mockBlock as any)

      // Don't fetch friends first
      const result = await blockUser(5)

      expect(result).toBe(true)
      expect(blocks.value).toHaveLength(1)
      expect(blocks.value[0]).toEqual(mockBlock)
    })
  })
})
