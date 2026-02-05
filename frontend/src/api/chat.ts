/**
 * Chat API
 * Endpoints for chat rooms and messages
 */

import { api } from './index'
import type { ChatRoom, Message, CreateRoomDto, SendMessageDto, EditMessageDto } from '../types'

export const chatApi = {
  /**
   * Get user's conversations (inbox)
   */
  getRooms(limit = 50): Promise<ChatRoom[]> {
    return api<ChatRoom[]>(`/chat/rooms?limit=${limit}`)
  },

  /**
   * Create a new chat room
   */
  createRoom(data: CreateRoomDto): Promise<ChatRoom> {
    return api<ChatRoom>('/chat/rooms', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Get messages for a chat room
   */
  getMessages(chatId: number, limit = 20, offset = 0): Promise<Message[]> {
    return api<Message[]>(`/chat/rooms/${chatId}/messages?limit=${limit}&offset=${offset}`)
  },

  /**
   * Send a message
   */
  sendMessage(data: SendMessageDto): Promise<Message> {
    return api<Message>('/chat/messages', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Edit a message
   */
  editMessage(messageId: number, data: EditMessageDto): Promise<Message> {
    return api<Message>(`/chat/messages/${messageId}`, {
      method: 'PATCH',
      body: data,
    })
  },

  /**
   * Delete a message (soft delete)
   */
  deleteMessage(messageId: number): Promise<void> {
    return api<void>(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Mark a chat as read
   */
  markAsRead(chatId: number): Promise<void> {
    return api<void>(`/chat/rooms/${chatId}/read`, {
      method: 'PATCH',
    })
  },

  /**
   * Leave a group chat
   */
  leaveChat(chatId: number): Promise<void> {
    return api<void>(`/chat/rooms/${chatId}/leave`, {
      method: 'DELETE',
    })
  },
}
