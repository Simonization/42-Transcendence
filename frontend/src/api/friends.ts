/**
 * Friends API
 * Endpoints for managing friends and blocks
 */

import { api } from './index'
import type { Friend, Block, AddFriendDto, RemoveFriendDto, BlockUserDto, UnblockUserDto } from '../types'

export const friendsApi = {
  /**
   * Get all friends for a user
   */
  getFriends(userId: number): Promise<Friend[]> {
    return api<Friend[]>(`/social/friends?myId=${userId}`)
  },

  /**
   * Send a friend request / add friend
   */
  addFriend(data: AddFriendDto): Promise<Friend> {
    return api<Friend>('/social/friends', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Remove a friend
   */
  removeFriend(data: RemoveFriendDto): Promise<void> {
    return api<void>('/social/friends', {
      method: 'DELETE',
      body: data,
    })
  },

  /**
   * Get all blocked users for a user
   */
  getBlocked(userId: number): Promise<Block[]> {
    return api<Block[]>(`/social/blocks?myId=${userId}`)
  },

  /**
   * Block a user
   */
  blockUser(data: BlockUserDto): Promise<Block> {
    return api<Block>('/social/blocks', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Unblock a user
   */
  unblockUser(data: UnblockUserDto): Promise<void> {
    return api<void>('/social/blocks', {
      method: 'DELETE',
      body: data,
    })
  },
}
