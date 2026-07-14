/**
 * Friends API
 * Endpoints for managing friends and blocks
 */

import { api } from './index'
import type { Friend, Block, AddFriendDto, RemoveFriendDto, BlockUserDto, UnblockUserDto } from '../types'

export const friendsApi = {
  /**
   * Get all friends for the authenticated user
   */
  getFriends(): Promise<Friend[]> {
    return api<Friend[]>('/social/friends')
  },

  /**
   * Send a friend request / add friend
   */
  addFriend(data: AddFriendDto): Promise<Friend> {
    return api<Friend>('/social/friends', {
      method: 'POST',
      body: data,
    }).then(res => {
        return res;
    }).catch(err => {
        //console.error('[friendsApi.addFriend] Error:', err);
        if (import.meta.env.DEV) {
          console.error('[friendsApi.addFriend] Error:', err);
        }
		throw err;
    });
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
   * Get all blocked users for the authenticated user
   */
  getBlocked(): Promise<Block[]> {
    return api<Block[]>('/social/blocks')
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
