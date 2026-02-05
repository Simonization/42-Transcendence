/**
 * useChat Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChat } from '../useChat'
import * as chatApiModule from '../../api/chat'

vi.mock('../../api/chat', () => ({
  chatApi: {
    getRooms: vi.fn(),
    createRoom: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    markAsRead: vi.fn(),
    leaveChat: vi.fn(),
  },
}))

vi.mock('../../api/index', () => ({
  getAccessToken: vi.fn(() => 'token'),
}))

const mockGetRooms = vi.mocked(chatApiModule.chatApi.getRooms)
const mockGetMessages = vi.mocked(chatApiModule.chatApi.getMessages)
const mockSendMessage = vi.mocked(chatApiModule.chatApi.sendMessage)
const mockCreateRoom = vi.mocked(chatApiModule.chatApi.createRoom)
const mockDeleteMessage = vi.mocked(chatApiModule.chatApi.deleteMessage)
const mockMarkAsRead = vi.mocked(chatApiModule.chatApi.markAsRead)

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchRooms', () => {
    it('should load chat rooms', async () => {
      const mockRooms = [
        { id: 1, type: 0, title: null, participants: [], lastMessage: null, isUnread: false },
      ]
      mockGetRooms.mockResolvedValueOnce(mockRooms as any)

      const { fetchRooms, rooms, isLoadingRooms } = useChat()
      await fetchRooms()

      expect(mockGetRooms).toHaveBeenCalled()
      expect(rooms.value).toEqual(mockRooms)
      expect(isLoadingRooms.value).toBe(false)
    })

    it('should set error on failure', async () => {
      mockGetRooms.mockRejectedValueOnce(new Error('fail'))

      const { fetchRooms, error } = useChat()
      await fetchRooms()

      expect(error.value).toBe('Failed to load conversations')
    })
  })

  describe('selectRoom', () => {
    it('should load messages for selected room', async () => {
      const mockMessages = [
        { id: 1, chatId: 5, content: 'hello', senderId: 1, createdAt: '2024-01-01' },
        { id: 2, chatId: 5, content: 'world', senderId: 2, createdAt: '2024-01-02' },
      ]
      mockGetMessages.mockResolvedValueOnce(mockMessages as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { selectRoom, messages, activeRoomId } = useChat()
      await selectRoom(5)

      expect(activeRoomId.value).toBe(5)
      expect(mockGetMessages).toHaveBeenCalledWith(5)
      // Messages should be reversed for display
      expect(messages.value[0].id).toBe(2)
      expect(messages.value[1].id).toBe(1)
    })
  })

  describe('sendMessage', () => {
    it('should send and append message', async () => {
      const mockMsg = { id: 3, chatId: 5, content: 'new msg', senderId: 1, createdAt: '2024-01-03' }
      mockSendMessage.mockResolvedValueOnce(mockMsg as any)
      mockGetMessages.mockResolvedValueOnce([])
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { selectRoom, sendMessage, messages } = useChat()
      await selectRoom(5)

      await sendMessage('new msg')

      expect(mockSendMessage).toHaveBeenCalledWith({
        chatId: 5,
        content: 'new msg',
      })
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].content).toBe('new msg')
    })

    it('should not send empty messages', async () => {
      const { sendMessage } = useChat()
      await sendMessage('')
      await sendMessage('   ')

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('createRoom', () => {
    it('should create a room and refresh list', async () => {
      const mockRoom = { id: 10, type: 0 }
      mockCreateRoom.mockResolvedValueOnce(mockRoom as any)
      mockGetRooms.mockResolvedValueOnce([])

      const { createRoom, activeRoomId } = useChat()
      const room = await createRoom([2])

      expect(room).toEqual(mockRoom)
      expect(activeRoomId.value).toBe(10)
      expect(mockGetRooms).toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockCreateRoom.mockRejectedValueOnce(new Error('fail'))

      const { createRoom, error } = useChat()
      const room = await createRoom([2])

      expect(room).toBeNull()
      expect(error.value).toBe('Failed to create conversation')
    })
  })

  describe('deleteMessage', () => {
    it('should soft-delete message locally', async () => {
      const mockMessages = [
        { id: 1, chatId: 5, content: 'hello', senderId: 1, createdAt: '2024-01-01', deletedAt: null },
      ]
      mockGetMessages.mockResolvedValueOnce(mockMessages as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)
      mockDeleteMessage.mockResolvedValueOnce(undefined)

      const { selectRoom, deleteMessage, messages } = useChat()
      await selectRoom(5)

      await deleteMessage(1)

      expect(messages.value[0].content).toBe('This message was deleted')
      expect(messages.value[0].deletedAt).toBeTruthy()
    })
  })

  describe('unreadCount', () => {
    it('should count unread rooms', async () => {
      mockGetRooms.mockResolvedValueOnce([
        { id: 1, isUnread: true },
        { id: 2, isUnread: false },
        { id: 3, isUnread: true },
      ] as any)

      const { fetchRooms, unreadCount } = useChat()
      await fetchRooms()

      expect(unreadCount.value).toBe(2)
    })
  })
})
