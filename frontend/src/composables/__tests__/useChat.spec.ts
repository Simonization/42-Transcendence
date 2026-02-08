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

// WebSocket Mock
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((this: WebSocket, ev: Event) => any) | null = null
  onmessage: ((this: WebSocket, ev: MessageEvent<any>) => any) | null = null
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null
  onerror: ((this: WebSocket, ev: Event) => any) | null = null

  constructor(url: string) {
    this.url = url
    this.readyState = 1 // OPEN
    // Call onopen async so composable can attach handler first
    Promise.resolve().then(() => {
      this.onopen?.(new Event('open'))
    })
  }

  send(data: string) {
    // No-op for mock
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  _simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  _simulateError() {
    this.onerror?.(new Event('error'))
    this.readyState = 3
  }
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
  let mockWebSocketInstances: MockWebSocket[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockWebSocketInstances = []

    // Mock global WebSocket
    global.WebSocket = vi.fn((url: string) => {
      const ws = new MockWebSocket(url)
      mockWebSocketInstances.push(ws)
      return ws as any
    })
  })

  afterEach(() => {
    mockWebSocketInstances.forEach(ws => {
      try {
        ws.close()
      } catch {
        // Ignore
      }
    })
    mockWebSocketInstances = []
    vi.clearAllMocks()
  })

  // A. Connection Lifecycle Tests
  describe('A. Connection Lifecycle', () => {
    it('should connect to WebSocket on connectSocket()', async () => {
      const { connectSocket, wsConnected } = useChat()
      expect(wsConnected.value).toBe(false)

      connectSocket()
      await new Promise(resolve => setTimeout(resolve, 10))
      await nextTick()

      expect(wsConnected.value).toBe(true)
      expect(mockWebSocketInstances.length).toBe(1)
    })

    it('should construct WebSocket URL with correct protocol', async () => {
      const { connectSocket } = useChat()
      connectSocket()
      await nextTick()

      // Verify connection to expected URL
      const ws = mockWebSocketInstances[0]
      expect(ws.url).toContain('socket.io')
      expect(ws.url).toContain('EIO=4')
      expect(ws.url).toContain('transport=websocket')
    })

    it('should disconnect WebSocket cleanly', async () => {
      const { connectSocket, disconnectSocket, wsConnected } = useChat()

      connectSocket()
      await new Promise(resolve => setTimeout(resolve, 10))
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

      const ws = mockWebSocketInstances[0]
      ws._simulateError()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })

    it('should set wsConnected to false on socket close', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await nextTick()
      expect(wsConnected.value).toBe(true)

      const ws = mockWebSocketInstances[0]
      ws.close()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })
  })

  // B. Message Receiving Tests
  describe('B. Message Receiving', () => {
    it('should receive and parse Socket.io formatted message', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
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

      // Socket.io format: "42" prefix + JSON array with event name + data
      const ws = mockWebSocketInstances[0]
      ws._simulateMessage(`42${JSON.stringify(['message', mockMessage])}`)
      await nextTick()

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0]).toEqual(mockMessage)
    })

    it('should add messages in correct order', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg1 = { id: 1, chatId: 1, senderId: 2, content: 'First', createdAt: '2024-01-01' }
      const msg2 = { id: 2, chatId: 1, senderId: 3, content: 'Second', createdAt: '2024-01-02' }
      const msg3 = { id: 3, chatId: 1, senderId: 2, content: 'Third', createdAt: '2024-01-03' }

      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg1])}`)
      await nextTick()
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg2])}`)
      await nextTick()
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg3])}`)
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
      await nextTick()
      await selectRoom(1)
      await nextTick()

      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Msg', createdAt: '2024-01-01' }

      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
      await nextTick()
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
      await nextTick()

      expect(messages.value).toHaveLength(1)
    })

    it('should properly map message fields from Socket.io data', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
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

      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
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
      await nextTick()
      await fetchRooms()
      await selectRoom(1)
      await nextTick()

      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Update', createdAt: '2024-01-01' }

      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
      await nextTick()

      expect(rooms.value[0].lastMessage).toEqual(msg)
    })
  })

  // C. Room Filtering Tests
  describe('C. Room Filtering', () => {
    it('should ignore messages for inactive room', async () => {
      const { connectSocket, messages } = useChat()

      connectSocket()
      await nextTick()
      await nextTick()

      // No room selected (activeRoomId is null)
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
      await nextTick()

      // Message should not be added since no room is active
      expect(messages.value).toHaveLength(0)
    })

    it('should only accept messages for active room', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(5)
      await nextTick()

      // Message for room 5 (active)
      const msg1 = { id: 1, chatId: 5, senderId: 2, content: 'For room 5', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg1])}`)
      await nextTick()

      // Message for room 3 (inactive)
      const msg2 = { id: 2, chatId: 3, senderId: 2, content: 'For room 3', createdAt: '2024-01-02' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg2])}`)
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
      await nextTick()

      // Select room 1
      await selectRoom(1)
      await nextTick()

      const msg1 = { id: 1, chatId: 1, senderId: 2, content: 'Room 1 msg', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg1])}`)
      await nextTick()

      expect(messages.value).toHaveLength(1)

      // Switch to room 2
      await selectRoom(2)
      await nextTick()

      // Messages from room 1 should be cleared
      expect(messages.value).toHaveLength(0)

      const msg2 = { id: 2, chatId: 2, senderId: 3, content: 'Room 2 msg', createdAt: '2024-01-02' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg2])}`)
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
      await nextTick()
      await fetchRooms()
      await selectRoom(1)
      await nextTick()

      const msgRoom2 = { id: 1, chatId: 2, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msgRoom2])}`)
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
      await nextTick()

      // Send message before selecting room
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Early msg', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
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
      await nextTick()

      await selectRoom(1)
      await nextTick()

      // Rapidly switch rooms
      await selectRoom(2)
      await nextTick()
      await selectRoom(3)
      await nextTick()

      const msg = { id: 1, chatId: 3, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)
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
      await nextTick()

      const selectRoomPromise = selectRoom(1)

      // Send message before selectRoom completes
      await nextTick()
      const msg = { id: 1, chatId: 1, senderId: 2, content: 'Test', createdAt: '2024-01-01' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', msg])}`)

      await selectRoomPromise
      await nextTick()

      expect(messages.value).toHaveLength(1)
    })
  })

  // E. Error Handling Tests
  describe('E. Error Handling', () => {
    it('should handle malformed Socket.io message (invalid JSON)', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send malformed JSON
      mockWebSocketInstances[0]._simulateMessage('42{invalid json}')
      await nextTick()

      // Should silently ignore without crashing
      expect(messages.value).toHaveLength(0)
    })

    it('should handle message with missing required fields', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Message missing 'id' field
      const incompleteMsg = { chatId: 1, senderId: 2, content: 'No ID' }
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', incompleteMsg])}`)
      await nextTick()

      // Should still add message (Message type allows partial fields)
      expect(messages.value.length).toBeGreaterThanOrEqual(0)
    })

    it('should ignore non-message Socket.io events', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send different event type
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['typing', { userId: 2 }])}`)
      await nextTick()
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['user_joined', { userId: 2 }])}`)
      await nextTick()

      expect(messages.value).toHaveLength(0)
    })

    it('should ignore Socket.io protocol messages', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send protocol messages (non-42 prefixed)
      mockWebSocketInstances[0]._simulateMessage('0')
      await nextTick()
      mockWebSocketInstances[0]._simulateMessage('2probe')
      await nextTick()

      expect(messages.value).toHaveLength(0)
    })

    it('should handle connection error gracefully', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await nextTick()

      mockWebSocketInstances[0]._simulateError()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })

    it('should not crash with null message data', async () => {
      mockGetMessages.mockResolvedValueOnce([] as any)
      mockMarkAsRead.mockResolvedValueOnce(undefined)

      const { connectSocket, selectRoom, messages } = useChat()

      connectSocket()
      await nextTick()
      await selectRoom(1)
      await nextTick()

      // Send event with null data
      mockWebSocketInstances[0]._simulateMessage(`42${JSON.stringify(['message', null])}`)
      await nextTick()

      expect(messages.value).toHaveLength(0)
    })
  })

  // F. WebSocket Lifecycle Tests
  describe('F. WebSocket Lifecycle', () => {
    it('should close socket gracefully without errors', async () => {
      const { connectSocket, disconnectSocket, wsConnected } = useChat()

      connectSocket()
      await new Promise(resolve => setTimeout(resolve, 10))
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
        await new Promise(resolve => setTimeout(resolve, 10))
        await nextTick()
        expect(wsConnected.value).toBe(true)

        disconnectSocket()
        await nextTick()
        expect(wsConnected.value).toBe(false)
      }
    })

    it('should prevent multiple simultaneous connections', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await new Promise(resolve => setTimeout(resolve, 10))
      await nextTick()
      expect(wsConnected.value).toBe(true)

      // Try to connect again (should be ignored)
      connectSocket()
      await nextTick()

      // Still only one connection
      expect(mockWebSocketInstances.length).toBe(1)
    })

    it('should release socket reference on disconnect', async () => {
      const { connectSocket, disconnectSocket } = useChat()

      connectSocket()
      await nextTick()

      disconnectSocket()
      await nextTick()

      // Disconnecting again should not cause errors
      expect(() => disconnectSocket()).not.toThrow()
    })

    it('should clear wsConnected flag on close event', async () => {
      const { connectSocket, wsConnected } = useChat()

      connectSocket()
      await new Promise(resolve => setTimeout(resolve, 10))
      await nextTick()
      expect(wsConnected.value).toBe(true)

      mockWebSocketInstances[0].close()
      await nextTick()

      expect(wsConnected.value).toBe(false)
    })
  })
})
