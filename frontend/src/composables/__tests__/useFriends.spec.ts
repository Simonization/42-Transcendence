/**
 * useFriends Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFriends } from '../useFriends'
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchFriends', () => {
    it('should load friends list', async () => {
      const mockFriends = [
        { id: 2, username: 'alice', status: 1, since: '2024-01-01', profile: {} },
      ]
      mockGetFriends.mockResolvedValueOnce(mockFriends as any)

      const { fetchFriends, friends, isLoading } = useFriends()
      await fetchFriends(1)

      expect(mockGetFriends).toHaveBeenCalledWith(1)
      expect(friends.value).toEqual(mockFriends)
      expect(isLoading.value).toBe(false)
    })

    it('should set error on failure', async () => {
      mockGetFriends.mockRejectedValueOnce(new Error('Network error'))

      const { fetchFriends, error } = useFriends()
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

      const { fetchBlocks, blocks } = useFriends()
      await fetchBlocks(1)

      expect(blocks.value).toEqual(mockBlocks)
    })
  })

  describe('addFriend', () => {
    it('should add a friend and return true', async () => {
      mockAddFriend.mockResolvedValueOnce({} as any)

      const { addFriend } = useFriends()
      const result = await addFriend(2)

      expect(result).toBe(true)
      expect(mockAddFriend).toHaveBeenCalledWith({ friendId: 2 })
    })

    it('should return false on error', async () => {
      mockAddFriend.mockRejectedValueOnce(new Error('fail'))

      const { addFriend, error } = useFriends()
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

      const { fetchFriends, removeFriend, friends } = useFriends()
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

      const { fetchFriends, blockUser, friends, blocks } = useFriends()
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

      const { fetchBlocks, unblockUser, blocks } = useFriends()
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

      const { fetchFriends, acceptedFriends, pendingFriends } = useFriends()
      await fetchFriends(1)

      expect(acceptedFriends.value).toHaveLength(2)
      expect(pendingFriends.value).toHaveLength(1)
      expect(pendingFriends.value[0].username).toBe('bob')
    })
  })
})
