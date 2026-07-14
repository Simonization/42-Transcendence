/**
 * Chat & Message Types
 * Matches backend ChatModule entity shapes
 */

export enum ChatType {
  DM = 0,
  Group = 1,
}

export interface ChatParticipant {
  id: number
  username: string
}

export interface Message {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  sender?: {
    id: number
    username: string
  }
  readBy?: number[]
  deliveredAt?: string | null
}

export interface TypingUser {
  userId: number
  username: string
  chatId: number
}

export interface TypingEvent {
  userId: number
  username: string
  chatId: number
}

export interface MessageReadEvent {
  userId: number
  chatId: number
  lastMessageId: number
}

export interface ChatRoom {
  id: number
  type: ChatType
  title: string | null
  participants: ChatParticipant[]
  lastMessage: Message | null
  isUnread: boolean
}

export interface CreateRoomDto {
  participantIds: number[]
  title?: string
}

export interface SendMessageDto {
  chatId: number
  content: string
  isGif?: boolean
}

export interface EditMessageDto {
  content: string
}
