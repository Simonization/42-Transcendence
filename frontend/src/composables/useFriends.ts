/**
 * Friends Composable
 * Manages friends and blocks state
 */

import { ref, computed } from 'vue'
import { friendsApi } from '../api/friends'
import { getErrorMessage } from '../utils/error'
import type { Friend, Block } from '../types'

export function useFriends() {
  const friends = ref<Friend[]>([])
  const blocks = ref<Block[]>([])
  const isLoading = ref(false)
  const error = ref('')

  const acceptedFriends = computed(() =>
    friends.value.filter(f => f.status === 1)
  )

  const pendingFriends = computed(() =>
    friends.value.filter(f => f.status === 0)
  )

  const fetchFriends = async (userId: number) => {
    isLoading.value = true
    error.value = ''
    try {
      friends.value = await friendsApi.getFriends(userId)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load friends')
    } finally {
      isLoading.value = false
    }
  }

  const fetchBlocks = async (userId: number) => {
    try {
      blocks.value = await friendsApi.getBlocked(userId)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load blocks')
    }
  }

  const addFriend = async (friendId: number) => {
    error.value = ''
    try {
      await friendsApi.addFriend({ friendId })
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to add friend')
      return false
    }
  }

  const removeFriend = async (friendId: number) => {
    error.value = ''
    try {
      await friendsApi.removeFriend({ friendId })
      friends.value = friends.value.filter(f => f.id !== friendId)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to remove friend')
      return false
    }
  }

  const blockUser = async (targetId: number, reason?: string) => {
    error.value = ''
    try {
      const block = await friendsApi.blockUser({ targetId, reason })
      blocks.value.push(block)
      // Also remove from friends list
      friends.value = friends.value.filter(f => f.id !== targetId)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to block user')
      return false
    }
  }

  const unblockUser = async (targetId: number) => {
    error.value = ''
    try {
      await friendsApi.unblockUser({ targetId })
      blocks.value = blocks.value.filter(b => b.blocked.id !== targetId)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to unblock user')
      return false
    }
  }

  return {
    friends,
    blocks,
    isLoading,
    error,
    acceptedFriends,
    pendingFriends,
    fetchFriends,
    fetchBlocks,
    addFriend,
    removeFriend,
    blockUser,
    unblockUser,
  }
}
