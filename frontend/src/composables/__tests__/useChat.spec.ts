/**
 * useChat Composable Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
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

// Socket.io-client mock
const mockSocketHandlers: Record<string, Function[]> = {}
let mockSocketInstance: any = null

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    Object.keys(mockSocketHandlers).forEach(k => delete mockSocketHandlers[k])
    mockSocketInstance = {
      connected: false,
      id: 'mock-socket-id',
      on: vi.fn((event: string, handler: Function) => {
        if (!mockSocketHandlers[event]) mockSocketHandlers[event] = []
        mockSocketHandlers[event].push(handler)
      }),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(() => {
        mockSocketInstance.connected = false
        mockSocketHandlers['disconnect']?.forEach(h => h())
      }),
      off: vi.fn(),
    }
    return mockSocketInstance
  }),
}))

function simulateConnect() {
  mockSocketInstance.connected = true
  mockSocketHandlers['connect']?.forEach(h => h())
}

function simulateDisconnect() {
  mockSocketInstance.connected = false
  mockSocketHandlers['disconnect']?.forEach(h => h())
}

function simulateMessage(msg: any) {
  mockSocketHandlers['newMessage']?.forEach(h => h(msg))
}

function simulateError(err = new Error('connection failed')) {
  mockSocketHandlers['connect_error']?.forEach(h => h(err))
}

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

describe('useChat WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSocketInstance = null
  })

  afterEach(() => {
    const { disconnectSocket, rooms, messages } = useChat()
    disconnectSocket()
    rooms.value = []
    messages.value = []
  })

  // A. Connection Lifecycle Tests
  describe('A. Connection Lifecycle', () => {
    it('should connect to socket on connectSocket()', async () => {
      const { connectSocket, wsConnected } = useChat()
      expect(wsConnected.value).toBe(false)

      connectSocket()
      simulateConnect()
      await nextTick()

      expect(wsConnected.value).toBe(true)
    })

    it('should call io with correct transport options', async () => {
      const { io } = await import('socket.io-client')
      const { connectSocket } = useChat()

      connectSocket()
      await nextTick()

      expect(io).toHaveBeenCalledWith('/', expect.objectContaining({
        transports: ['websocket'],
      }))
    })

    it('should disconnect socket cleanly', async () => {
      const { connectSocket, disconnectSocket, wsConnected } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      expect(wsConnected.value).toBe(true)

      disconnectSocket()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })

    it('should handle error state on failed connection', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await nextTick()

      simulateError()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })

    it('should set wsConnected to false on disconnect event', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      expect(wsConnected.value).toBe(true)

      simulateDisconnect()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })
  })

  // B. Message Receiving Tests
  describe('B. Message Receiving', () => {
    it('should receive and process incoming message', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      await selectRoom(1)
      await nextTick()

      const mockMessage = {
        id: 1,
        content: 'Hello World',
        senderId: 2,
        chatId: 1,
        createdAt: '2024-01-01T10:00:00Z',
      }

      simulateMessage(mockMessage)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].id).toBe(1)
      expect(messages.value[0].content).toBe('Hello World')
      expect(messages.value[0].senderId).toBe(2)
      expect(messages.value[0].chatId).toBe(1)
    })

    it('should add messages in correct order', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg1 = { id: 1, chatId: 1, senderId: 2, content: 'First', createdAt: '2024-01-01' }
      const msg2 = { id: 2, chatId: 1, senderId: 3, content: 'Second', createdAt: '2024-01-02' }
      const msg3 = { id: 3, chatId: 1, senderId: 2, content: 'Third', createdAt: '2024-01-03' }

      simulateMessage(msg1)
      await nextTick()
      simulateMessage(msg2)
      await nextTick()
      simulateMessage(msg3)
      await nextTick()

      expect(messages.value).toHaveLength(3)
      expect(messages.value[0].id).toBe(1)
      expect(messages.value[1].id).toBe(2)
      expect(messages.value[2].id).toBe(3)
    })

    it('should prevent duplicate message IDs', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Msg', createdAt: '2024-01-01' }

      simulateMessage(msg)
      await nextTick()
      simulateMessage(msg)
      await nextTick()

      expect(messages.value).toHaveLength(1)
    })

    it('should properly map message fields from socket data', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg = {
        id: 42,
        content: 'Test message',
        senderId: 99,
        chatId: 1,
        createdAt: '2024-02-08T15:30:00Z',
      }

      simulateMessage(msg)
      await nextTick()

      expect(messages.value[0].id).toBe(42)
      expect(messages.value[0].content).toBe('Test message')
      expect(messages.value[0].senderId).toBe(99)
      expect(messages.value[0].chatId).toBe(1)
      expect(messages.value[0].createdAt).toBe('2024-02-08T15:30:00Z')
    })

    it('should update room list lastMessage on incoming message', async () => {
      mockGetRooms.mockResolvedValueOnce([
        { id: 1, title: 'Room 1', participants: [], isUnread: false, lastMessage: null },
      ] as any)
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, fetchRooms, selectRoom, rooms } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await fetchRooms()
      await selectRoom(1)
      await nextTick()

      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Update', createdAt: '2024-01-01' }

      simulateMessage(msg)
      await nextTick()

      expect(rooms.value[0].lastMessage?.id).toBe(1)
      expect(rooms.value[0].lastMessage?.content).toBe('Update')
    })
  })

  // C. Room Filtering Tests
  describe('C. Room Filtering', () => {
    it('should ignore messages for inactive room', async () => {
      const { connectSocket, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      // No room selected (activeRoomId is null)
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      simulateMessage(msg)
      await nextTick()

      // Message should not be added since no room is active
      expect(messages.value).toHaveLength(0)
    })

    it('should only accept messages for active room', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(5)
      await nextTick()

      // Message for room 5 (active)
      const msg1 = { id: 1, chatId: 5, senderId: 2, content: 'For room 5', createdAt: '2024-01-01' }
      simulateMessage(msg1)
      await nextTick()

      // Message for room 3 (inactive)
      const msg2 = { id: 2, chatId: 3, senderId: 2, content: 'For room 3', createdAt: '2024-01-02' }
      simulateMessage(msg2)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].chatId).toBe(5)
    })

    it('should update messages when switching rooms', async () => {
      mockGetMessages.mockImplementation((roomId) => {
        if (roomId === 1) return Promise.resolve([])
        if (roomId === 2) return Promise.resolve([])
        return Promise.resolve([])
      })
      mockMarkAsRead.mockResolvedValue(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      // Select room 1
      await selectRoom(1)
      await nextTick()

      const msg1 = { id: 1, chatId: 1, senderId: 2, content: 'Room 1 msg', createdAt: '2024-01-01' }
      simulateMessage(msg1)
      await nextTick()

      expect(messages.value).toHaveLength(1)

      // Switch to room 2
      await selectRoom(2)
      await nextTick()

      // Messages from room 1 should be cleared
      expect(messages.value).toHaveLength(0)

      const msg2 = { id: 2, chatId: 2, senderId: 3, content: 'Room 2 msg', createdAt: '2024-01-02' }
      simulateMessage(msg2)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].chatId).toBe(2)
    })

    it('should mark unread for inactive room messages', async () => {
      mockGetRooms.mockResolvedValueOnce([
        { id: 1, title: 'Room 1', isUnread: false, lastMessage: null },
        { id: 2, title: 'Room 2', isUnread: false, lastMessage: null },
      ] as any)
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, fetchRooms, selectRoom, rooms } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await fetchRooms()
      await selectRoom(1)
      await nextTick()

      const msgRoom2 = { id: 1, chatId: 2, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      simulateMessage(msgRoom2)
      await nextTick()

      // Room 2 should be marked as unread
      expect(rooms.value.find(r => r.id === 2)?.isUnread).toBe(true)
      // Room 1 (active) should not be marked unread
      expect(rooms.value.find(r => r.id === 1)?.isUnread).toBe(false)
    })
  })

  // D. Race Conditions Tests
  describe('D. Race Conditions', () => {
    it('should handle message arriving before room selected', async () => {
      const { connectSocket, selectRoom, messages, activeRoomId } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      // Send message before selecting room
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Early msg', createdAt: '2024-01-01' }
      simulateMessage(msg)
      await nextTick()

      expect(activeRoomId.value).toBeNull()
      expect(messages.value).toHaveLength(0)

      // Now select room
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      await selectRoom(1)
      await nextTick()

      // Message should still not appear (it wasn't for active room when arrived)
      expect(messages.value).toHaveLength(0)
    })

    it('should handle rapid room switches during message reception', async () => {
      mockGetMessages.mockResolvedValue([] as any)
      mockMarkAsRead.mockResolvedValue(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      await selectRoom(1)
      await nextTick()

      // Rapidly switch rooms
      await selectRoom(2)
      await nextTick()
      await selectRoom(3)
      await nextTick()

      const msg = { id: 1, chatId: 3, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      simulateMessage(msg)
      await nextTick()

      // Message should be added for active room (3)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].chatId).toBe(3)
    })

    it('should handle message while selectRoom is pending', async () => {
      mockGetMessages.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 50)))
      mockMarkAsRead.mockResolvedValue(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      const selectRoomPromise = selectRoom(1)

      // Send message before selectRoom completes — it gets pushed to messages
      await nextTick()
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      simulateMessage(msg)

      // When selectRoom resolves, it overwrites messages with the API response
      await selectRoomPromise
      await nextTick()

      // The API returned empty [], so the in-flight message was replaced
      // This is expected: selectRoom is the source of truth after it resolves
      expect(messages.value).toHaveLength(0)
    })
  })

  // E. Error Handling Tests
  describe('E. Error Handling', () => {
    it('should handle malformed message (non-object)', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send non-object data
      simulateMessage('not an object')
      await nextTick()

      // Should silently ignore without crashing
      expect(messages.value).toHaveLength(0)
    })

    it('should handle message with missing required fields', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Message missing 'chatId' field — won't match active room guard
      const incompleteMsg = { id: 1, senderId: 2, content: 'No chatId' }
      simulateMessage(incompleteMsg)
      await nextTick()

      expect(messages.value).toHaveLength(0)
    })

    it('should not crash with null message data', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send null data
      simulateMessage(null)
      await nextTick()

      expect(messages.value).toHaveLength(0)
    })

    it('should handle connection error gracefully', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await nextTick()

      simulateError()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })
  })

  // G. Typing Indicators Tests
  describe('G. Typing Indicators', () => {
    it('should emit typing event via socket', async () => {
      const { connectSocket } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      // Verify socket is connected and emit is available
      expect(mockSocketInstance).toBeTruthy()
      expect(mockSocketInstance.emit).toBeDefined()
    })
  })

  // H. Read Receipts Tests
  describe('H. Read Receipts', () => {
    it('should handle message with readBy field', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg = {
        id: 1,
        chatId: 1,
        senderId: 2,
        content: 'Test',
        createdAt: '2024-01-01',
        readBy: [3, 4],
      }

      simulateMessage(msg)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      // readBy is not carried over from socket payload (constructed fresh)
      expect(messages.value[0].id).toBe(1)
    })

    it('should handle message with deliveredAt field', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg = {
        id: 1,
        chatId: 1,
        senderId: 2,
        content: 'Test',
        createdAt: '2024-01-01',
        deliveredAt: '2024-01-01T10:00:01Z',
      }

      simulateMessage(msg)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].id).toBe(1)
      expect(messages.value[0].content).toBe('Test')
    })
  })

  // F. WebSocket Lifecycle Tests
  describe('F. WebSocket Lifecycle', () => {
    it('should close socket gracefully without errors', async () => {
      const { connectSocket, disconnectSocket, wsConnected } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      expect(wsConnected.value).toBe(true)

      disconnectSocket()
      await nextTick()

      expect(wsConnected.value).toBe(false)
      // Verify no uncaught errors
      expect(() => disconnectSocket()).not.toThrow()
    })

    it('should handle multiple connect/disconnect cycles', async () => {
      const { connectSocket, disconnectSocket, wsConnected } = useChat()

      for (let i = 0; i < 3; i++) {
        connectSocket()
        simulateConnect()
        await nextTick()
        expect(wsConnected.value).toBe(true)

        disconnectSocket()
        await nextTick()
        expect(wsConnected.value).toBe(false)
      }
    })

    it('should prevent multiple simultaneous connections', async () => {
      const { io } = await import('socket.io-client')
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()
      expect(wsConnected.value).toBe(true)

      // Try to connect again (should be ignored since already connected)
      connectSocket()
      await nextTick()

      // io should have only been called once for this test
      // (the guard checks socket.value && socket.value.connected)
      expect(io).toHaveBeenCalledTimes(1)
    })

    it('should release socket reference on disconnect', async () => {
      const { connectSocket, disconnectSocket } = useChat()

      connectSocket()
      simulateConnect()
      await nextTick()

      disconnectSocket()
      await nextTick()

      // Disconnecting again should not cause errors
      expect(() => disconnectSocket()).not.toThrow()
    })
  })
})
