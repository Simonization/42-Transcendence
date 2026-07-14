/**
 * Chat API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { chatApi } from '../chat'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRooms', () => {
    it('should fetch chat rooms with default limit', async () => {
      const mockRooms = [{ id: 1, type: 0, title: null }]
      mockApi.mockResolvedValueOnce(mockRooms)

      const result = await chatApi.getRooms()

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms?limit=50')
      expect(result).toEqual(mockRooms)
    })

    it('should fetch chat rooms with custom limit', async () => {
      mockApi.mockResolvedValueOnce([])

      await chatApi.getRooms(10)

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms?limit=10')
    })
  })

  describe('createRoom', () => {
    it('should create a DM room', async () => {
      const mockRoom = { id: 1, type: 0 }
      mockApi.mockResolvedValueOnce(mockRoom)

      const result = await chatApi.createRoom({ participantIds: [2] })

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms', {
        method: 'POST',
        body: { participantIds: [2] },
      })
      expect(result).toEqual(mockRoom)
    })

    it('should create a group room with title', async () => {
      mockApi.mockResolvedValueOnce({ id: 2, type: 1, title: 'Team' })

      await chatApi.createRoom({ participantIds: [2, 3], title: 'Team' })

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms', {
        method: 'POST',
        body: { participantIds: [2, 3], title: 'Team' },
      })
    })
  })

  describe('getMessages', () => {
    it('should fetch messages with defaults', async () => {
      const mockMessages = [{ id: 1, content: 'hello' }]
      mockApi.mockResolvedValueOnce(mockMessages)

      const result = await chatApi.getMessages(5)

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms/5/messages?limit=20&offset=0')
      expect(result).toEqual(mockMessages)
    })

    it('should fetch messages with custom pagination', async () => {
      mockApi.mockResolvedValueOnce([])

      await chatApi.getMessages(5, 50, 10)

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms/5/messages?limit=50&offset=10')
    })
  })

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const mockMsg = { id: 1, content: 'hello', chatId: 5 }
      mockApi.mockResolvedValueOnce(mockMsg)

      const result = await chatApi.sendMessage({ chatId: 5, content: 'hello' })

      expect(mockApi).toHaveBeenCalledWith('/chat/messages', {
        method: 'POST',
        body: { chatId: 5, content: 'hello' },
      })
      expect(result).toEqual(mockMsg)
    })
  })

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const mockMsg = { id: 1, content: 'updated' }
      mockApi.mockResolvedValueOnce(mockMsg)

      const result = await chatApi.editMessage(1, { content: 'updated' })

      expect(mockApi).toHaveBeenCalledWith('/chat/messages/1', {
        method: 'PATCH',
        body: { content: 'updated' },
      })
      expect(result).toEqual(mockMsg)
    })
  })

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await chatApi.deleteMessage(1)

      expect(mockApi).toHaveBeenCalledWith('/chat/messages/1', {
        method: 'DELETE',
      })
    })
  })

  describe('markAsRead', () => {
    it('should mark a chat as read', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await chatApi.markAsRead(5)

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms/5/read', {
        method: 'PATCH',
      })
    })
  })

  describe('leaveChat', () => {
    it('should leave a chat', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await chatApi.leaveChat(5)

      expect(mockApi).toHaveBeenCalledWith('/chat/rooms/5/leave', {
        method: 'DELETE',
      })
    })
  })
})
