/**
 * Friend & Block Types
 * Matches backend FriendsModule entity shapes
 */

import type { UserProfile } from './user'

export enum FriendStatus {
  Pending = 0,
  Accepted = 1,
}

export interface Friend {
  id: number
  username: string
  profile: UserProfile
  status: FriendStatus
  since: string
}

export interface Block {
  id: number
  blocker: { id: number; username: string }
  blocked: { id: number; username: string }
  reason: string | null
  createdAt: string
}

export interface AddFriendDto {
  friendId: number
}

export interface RemoveFriendDto {
  friendId: number
}

export interface BlockUserDto {
  targetId: number
  reason?: string
}

export interface UnblockUserDto {
  targetId: number
}
