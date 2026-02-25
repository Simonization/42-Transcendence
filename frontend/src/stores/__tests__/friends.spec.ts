/**
 * Friends Store Unit Tests
 * Tests for friend/block state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as friendsApiModule from '../../api/friends'

vi.mock('../../api/friends', () => ({
  friendsApi: {
    getFriends: vi.fn(),
    getBlocked: vi.fn(),
    addFriend: vi.fn(),
    removeFriend: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  },
}))

const mockGetFriends = vi.mocked(friendsApiModule.friendsApi.getFriends)
const mockGetBlocked = vi.mocked(friendsApiModule.friendsApi.getBlocked)
const mockAddFriend = vi.mocked(friendsApiModule.friendsApi.addFriend)
const mockRemoveFriend = vi.mocked(friendsApiModule.friendsApi.removeFriend)
const mockBlockUser = vi.mocked(friendsApiModule.friendsApi.blockUser)
const mockUnblockUser = vi.mocked(friendsApiModule.friendsApi.unblockUser)

import { useFriendsStore } from '../friends'

const MOCK_FRIEND = {
  id: 2,
  username: 'alice',
  status: 1,
  profile: { displayName: 'Alice', avatarUrl: null },
}

const MOCK_BLOCK = {
  id: 1,
  blocker: { id: 1 },
  blocked: { id: 3, username: 'bob' },
  reason: null,
}

describe('useFriendsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with empty friends and blocks', () => {
      const store = useFriendsStore()
      expect(store.friends).toHaveLength(0)
      expect(store.blocks).toHaveLength(0)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('')
    })
  })

  describe('acceptedFriends / pendingFriends computed', () => {
    it('acceptedFriends should return friends with status 1', () => {
      const store = useFriendsStore()
      store.$patch({
        friends: [
          { ...MOCK_FRIEND, status: 1 },
          { ...MOCK_FRIEND, id: 3, status: 0 },
        ] as any,
      })

      expect(store.acceptedFriends).toHaveLength(1)
      expect(store.acceptedFriends[0].id).toBe(2)
    })

    it('pendingFriends should return friends with status 0', () => {
      const store = useFriendsStore()
      store.$patch({
        friends: [
          { ...MOCK_FRIEND, status: 1 },
          { ...MOCK_FRIEND, id: 3, status: 0 },
        ] as any,
      })

      expect(store.pendingFriends).toHaveLength(1)
      expect(store.pendingFriends[0].id).toBe(3)
    })
  })

  describe('fetchFriends', () => {
    it('should load friends and set isLoading to false', async () => {
      const store = useFriendsStore()
      mockGetFriends.mockResolvedValueOnce([MOCK_FRIEND] as any)

      await store.fetchFriends(1)

      expect(store.friends).toHaveLength(1)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('')
    })

    it('should set error on failure', async () => {
      const store = useFriendsStore()
      mockGetFriends.mockRejectedValueOnce(new Error('Network error'))

      await store.fetchFriends(1)

      expect(store.error).toBeTruthy()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchBlocks', () => {
    it('should load blocked users', async () => {
      const store = useFriendsStore()
      mockGetBlocked.mockResolvedValueOnce([MOCK_BLOCK] as any)

      await store.fetchBlocks(1)

      expect(store.blocks).toHaveLength(1)
    })
  })

  describe('addFriend', () => {
    it('should return true on success', async () => {
      const store = useFriendsStore()
      mockAddFriend.mockResolvedValueOnce(MOCK_FRIEND as any)

      const result = await store.addFriend(2)
      expect(result).toBe(true)
    })

    it('should return false and set error on failure', async () => {
      const store = useFriendsStore()
      mockAddFriend.mockRejectedValueOnce(new Error('Already friends'))

      const result = await store.addFriend(2)
      expect(result).toBe(false)
      expect(store.error).toBeTruthy()
    })
  })

  describe('removeFriend', () => {
    it('should remove friend from local list on success', async () => {
      const store = useFriendsStore()
      store.$patch({ friends: [MOCK_FRIEND] as any })
      mockRemoveFriend.mockResolvedValueOnce(undefined as any)

      const result = await store.removeFriend(2)

      expect(result).toBe(true)
      expect(store.friends.find(f => f.id === 2)).toBeUndefined()
    })

    it('should return false and set error on failure', async () => {
      const store = useFriendsStore()
      mockRemoveFriend.mockRejectedValueOnce(new Error('Not friends'))

      const result = await store.removeFriend(2)
      expect(result).toBe(false)
    })
  })

  describe('blockUser', () => {
    it('should add to blocks and remove from friends', async () => {
      const store = useFriendsStore()
      store.$patch({ friends: [MOCK_FRIEND] as any })
      mockBlockUser.mockResolvedValueOnce(MOCK_BLOCK as any)

      const result = await store.blockUser(2, 'spam')

      expect(result).toBe(true)
      expect(store.blocks).toHaveLength(1)
      expect(store.friends.find(f => f.id === 2)).toBeUndefined()
    })

    it('should return false on API failure', async () => {
      const store = useFriendsStore()
      mockBlockUser.mockRejectedValueOnce(new Error('Cannot block'))

      const result = await store.blockUser(2)
      expect(result).toBe(false)
    })
  })

  describe('unblockUser', () => {
    it('should remove from blocks list on success', async () => {
      const store = useFriendsStore()
      store.$patch({ blocks: [MOCK_BLOCK] as any })
      mockUnblockUser.mockResolvedValueOnce(undefined as any)

      const result = await store.unblockUser(3)

      expect(result).toBe(true)
      expect(store.blocks.find(b => b.blocked.id === 3)).toBeUndefined()
    })

    it('should return false on failure', async () => {
      const store = useFriendsStore()
      mockUnblockUser.mockRejectedValueOnce(new Error('Not blocked'))

      const result = await store.unblockUser(3)
      expect(result).toBe(false)
    })
  })
})
