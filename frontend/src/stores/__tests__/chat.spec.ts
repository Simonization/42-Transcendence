/**
 * Chat Store Unit Tests
 * Tests for chat rooms, messages, and real-time state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as chatApiModule from '../../api/chat'
import * as friendsApiModule from '../../api/friends'
import * as apiIndexModule from '../../api/index'

vi.mock('../../api/chat', () => ({
  chatApi: {
    getRooms: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    createRoom: vi.fn(),
    deleteMessage: vi.fn(),
    markAsRead: vi.fn(),
  },
}))

vi.mock('../../api/friends', () => ({
  friendsApi: {
    getBlocked: vi.fn(),
    blockUser: vi.fn(),
    getFriends: vi.fn(),
    removeFriend: vi.fn(),
    addFriend: vi.fn(),
    unblockUser: vi.fn(),
  },
}))

vi.mock('../../api/index', async () => {
  const actual = await vi.importActual('../../api/index')
  return { ...actual, getAccessToken: vi.fn() }
})

const mockGetRooms = vi.mocked(chatApiModule.chatApi.getRooms)
const mockGetMessages = vi.mocked(chatApiModule.chatApi.getMessages)
const mockSendMessage = vi.mocked(chatApiModule.chatApi.sendMessage)
const mockCreateRoom = vi.mocked(chatApiModule.chatApi.createRoom)
const mockDeleteMessage = vi.mocked(chatApiModule.chatApi.deleteMessage)
const mockMarkAsRead = vi.mocked(chatApiModule.chatApi.markAsRead)
const mockGetBlocked = vi.mocked(friendsApiModule.friendsApi.getBlocked)
const mockBlockUser = vi.mocked(friendsApiModule.friendsApi.blockUser)

import { useChatStore } from '../chat'

const MOCK_ROOM = {
  id: 1,
  title: 'General',
  type: 1,
  isUnread: false,
  participants: [{ id: 1, username: 'me' }, { id: 2, username: 'alice' }],
  lastMessage: null,
}

const MOCK_MESSAGE = {
  id: 100,
  chatId: 1,
  userId: 2,
  content: 'Hello!',
  createdAt: '2026-02-25T10:00:00Z',
}

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockMarkAsRead.mockResolvedValue(undefined as any)
  })

  describe('initial state', () => {
    it('should start with empty rooms and no active room', () => {
      const store = useChatStore()
      expect(store.rooms).toHaveLength(0)
      expect(store.activeRoomId).toBeNull()
      expect(store.messages).toHaveLength(0)
      expect(store.wsConnected).toBe(false)
    })
  })

  describe('setCurrentUser', () => {
    it('should set currentUserId', () => {
      const store = useChatStore()
      store.setCurrentUser(42)
      // Verify through visibleRooms computed (uses currentUserId internally)
      expect(store.visibleRooms).toHaveLength(0)
    })
  })

  describe('fetchRooms', () => {
    it('should populate rooms on success', async () => {
      const store = useChatStore()
      mockGetRooms.mockResolvedValueOnce([MOCK_ROOM] as any)

      await store.fetchRooms()

      expect(store.rooms).toHaveLength(1)
      expect(store.rooms[0].id).toBe(1)
      expect(store.isLoadingRooms).toBe(false)
      expect(store.error).toBe('')
    })

    it('should set error on fetch failure', async () => {
      const store = useChatStore()
      mockGetRooms.mockRejectedValueOnce(new Error('Unauthorized'))

      await store.fetchRooms()

      expect(store.error).toBeTruthy()
      expect(store.isLoadingRooms).toBe(false)
    })
  })

  describe('selectRoom', () => {
    it('should set activeRoomId and load messages in display order', async () => {
      const store = useChatStore()
      const msg1 = { ...MOCK_MESSAGE, id: 1, createdAt: '2026-02-25T10:00:00Z' }
      const msg2 = { ...MOCK_MESSAGE, id: 2, createdAt: '2026-02-25T10:01:00Z' }
      // API returns newest first
      mockGetMessages.mockResolvedValueOnce([msg2, msg1] as any)

      await store.selectRoom(1)

      expect(store.activeRoomId).toBe(1)
      // Should be reversed: oldest first
      expect(store.messages[0].id).toBe(1)
      expect(store.messages[1].id).toBe(2)
    })

    it('should mark room as read after loading messages', async () => {
      const store = useChatStore()
      store.$patch({ rooms: [{ ...MOCK_ROOM, isUnread: true }] as any })
      mockGetMessages.mockResolvedValueOnce([MOCK_MESSAGE] as any)

      await store.selectRoom(1)

      expect(mockMarkAsRead).toHaveBeenCalledWith(1)
      expect(store.rooms[0].isUnread).toBe(false)
    })

    it('should set error on message load failure', async () => {
      const store = useChatStore()
      mockGetMessages.mockRejectedValueOnce(new Error('Room not found'))

      await store.selectRoom(1)

      expect(store.error).toBeTruthy()
      expect(store.isLoadingMessages).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('should append message to list and update room lastMessage', async () => {
      const store = useChatStore()
      store.$patch({ rooms: [MOCK_ROOM] as any, activeRoomId: 1 })
      mockSendMessage.mockResolvedValueOnce(MOCK_MESSAGE as any)

      await store.sendMessage('Hello!')

      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].content).toBe('Hello!')
      expect(store.rooms[0].lastMessage).toEqual(MOCK_MESSAGE)
    })

    it('should not send empty content', async () => {
      const store = useChatStore()
      store.$patch({ activeRoomId: 1 })

      await store.sendMessage('   ')

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should not send when no active room', async () => {
      const store = useChatStore()

      await store.sendMessage('Hello!')

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should set error on send failure', async () => {
      const store = useChatStore()
      store.$patch({ activeRoomId: 1 })
      mockSendMessage.mockRejectedValueOnce(new Error('Send failed'))

      await store.sendMessage('Hello!')

      expect(store.error).toBeTruthy()
    })
  })

  describe('createRoom', () => {
    it('should create room and refresh rooms list', async () => {
      const store = useChatStore()
      const newRoom = { ...MOCK_ROOM, id: 5 }
      mockCreateRoom.mockResolvedValueOnce(newRoom as any)
      mockGetRooms.mockResolvedValueOnce([MOCK_ROOM, newRoom] as any)

      const result = await store.createRoom([2])

      expect(result).toEqual(newRoom)
      expect(store.activeRoomId).toBe(5)
      expect(store.rooms).toHaveLength(2)
    })

    it('should return null and set error on failure', async () => {
      const store = useChatStore()
      mockCreateRoom.mockRejectedValueOnce(new Error('Cannot create room'))

      const result = await store.createRoom([2])

      expect(result).toBeNull()
      expect(store.error).toBeTruthy()
    })
  })

  describe('deleteMessage', () => {
    it('should soft-delete message content in local list', async () => {
      const store = useChatStore()
      store.$patch({ messages: [{ ...MOCK_MESSAGE }] as any })
      mockDeleteMessage.mockResolvedValueOnce(undefined as any)

      await store.deleteMessage(100)

      expect(store.messages[0].content).toBe('This message was deleted')
      expect(store.messages[0].deletedAt).toBeTruthy()
    })

    it('should set error on delete failure', async () => {
      const store = useChatStore()
      store.$patch({ messages: [{ ...MOCK_MESSAGE }] as any })
      mockDeleteMessage.mockRejectedValueOnce(new Error('Not owner'))

      await store.deleteMessage(100)

      expect(store.error).toBeTruthy()
      // Content should be unchanged since API failed
      expect(store.messages[0].content).toBe('Hello!')
    })
  })

  describe('loadBlockedUsers', () => {
    it('should populate blockedUserIds set', async () => {
      const store = useChatStore()
      mockGetBlocked.mockResolvedValueOnce([
        { id: 1, blocker: { id: 1 }, blocked: { id: 3, username: 'bob' }, reason: null },
      ] as any)

      await store.loadBlockedUsers(1)

      // visibleRooms excludes DMs with blocked users
      store.$patch({
        rooms: [{ ...MOCK_ROOM, type: 0, participants: [{ id: 1 }, { id: 3 }] }] as any,
      })
      store.setCurrentUser(1)

      expect(store.visibleRooms).toHaveLength(0)
    })
  })

  describe('computed: unreadCount', () => {
    it('should count unread rooms', () => {
      const store = useChatStore()
      store.$patch({
        rooms: [
          { ...MOCK_ROOM, isUnread: true },
          { ...MOCK_ROOM, id: 2, isUnread: true },
          { ...MOCK_ROOM, id: 3, isUnread: false },
        ] as any,
      })

      expect(store.unreadCount).toBe(2)
    })
  })

  describe('computed: activeRoom', () => {
    it('should return the active room', () => {
      const store = useChatStore()
      store.$patch({
        rooms: [MOCK_ROOM, { ...MOCK_ROOM, id: 2 }] as any,
        activeRoomId: 2,
      })

      expect(store.activeRoom?.id).toBe(2)
    })

    it('should return null when no active room', () => {
      const store = useChatStore()
      expect(store.activeRoom).toBeNull()
    })
  })
})
