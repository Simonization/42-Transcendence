/**
 * The chat store and the useChat composable share one socket. These tests pin that: a browser
 * on the chat page holds a single connection, and closing the page does not close it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const h = vi.hoisted(() => {
  type Fn = (...args: any[]) => void
  class FakeSocket {
    connected = false
    handlers = new Map<string, Fn[]>()
    emitted: Array<{ event: string; args: any[] }> = []
    disconnect = vi.fn(() => {
      this.connected = false
      this.trigger('disconnect')
    })
    on(event: string, fn: Fn) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn])
      return this
    }
    emit(event: string, ...args: any[]) {
      this.emitted.push({ event, args })
      return this
    }
    trigger(event: string, ...args: any[]) {
      this.handlers.get(event)?.forEach((fn) => fn(...args))
    }
    fireConnect() {
      this.connected = true
      this.trigger('connect')
    }
    sent(event: string) {
      return this.emitted.filter((e) => e.event === event).map((e) => e.args[0])
    }
  }
  return { FakeSocket, sockets: [] as InstanceType<typeof FakeSocket>[] }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const socket = new h.FakeSocket()
    h.sockets.push(socket)
    return socket
  }),
}))

vi.mock('../../api', () => ({
  getAccessToken: () => 'token',
  clearTokens: vi.fn(),
}))

vi.mock('../../api/chat', () => ({
  chatApi: {
    getRooms: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
    createRoom: vi.fn(),
    deleteMessage: vi.fn(),
  },
}))

vi.mock('../../api/friends', () => ({
  friendsApi: { getBlocked: vi.fn().mockResolvedValue([]), blockUser: vi.fn() },
}))

import { io } from 'socket.io-client'
import { useChatStore } from '../chat'
import { useChat } from '../../composables/useChat'
import { disconnectSocket as closeSharedSocket, getSocket } from '../../services/socket'

const socket = () => h.sockets[h.sockets.length - 1]
const message = (id: number, chatId = 1) => ({ id, chatId, senderId: 2, content: `m${id}`, createdAt: '2026-01-01' })

describe('chat store on the shared socket', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    h.sockets.length = 0
    vi.mocked(io).mockClear()
  })

  afterEach(() => {
    useChatStore().disconnectSocket()
    useChat().disconnectSocket()
    closeSharedSocket()
  })

  it('opens a single socket when both the app shell and the chat page connect', () => {
    const store = useChatStore()
    const chat = useChat()

    chat.connectSocket()
    store.connectSocket()
    store.connectSocket()
    chat.connectSocket()

    expect(io).toHaveBeenCalledTimes(1)
    expect(h.sockets).toHaveLength(1)
  })

  it('reflects the shared connection state', async () => {
    const store = useChatStore()
    expect(store.wsConnected).toBe(false)

    store.connectSocket()
    socket().fireConnect()
    await nextTick()
    expect(store.wsConnected).toBe(true)

    socket().trigger('disconnect')
    await nextTick()
    expect(store.wsConnected).toBe(false)
  })

  it('adds an incoming message to the open room exactly once, however often the page reopens', async () => {
    const store = useChatStore()
    store.connectSocket()
    socket().fireConnect()
    await store.selectRoom(1)

    store.disconnectSocket()
    store.connectSocket()
    store.connectSocket()
    socket().trigger('newMessage', message(10))

    expect(store.messages.filter((m) => m.id === 10)).toHaveLength(1)
  })

  it('registers the chat page listeners on the one socket', () => {
    const store = useChatStore()
    store.connectSocket()

    for (const event of ['newMessage', 'userTyping', 'messagesRead']) {
      expect(socket().handlers.get(event), event).toHaveLength(1)
    }
  })

  it('leaves the shared socket open when the chat page closes', () => {
    const store = useChatStore()
    store.connectSocket()
    socket().fireConnect()

    store.disconnectSocket()

    expect(socket().disconnect).not.toHaveBeenCalled()
    expect(getSocket()).toBe(socket())
  })

  it('stops updating chat state once the page has closed, while the app shell keeps listening', async () => {
    const store = useChatStore()
    const chat = useChat()
    chat.connectSocket()
    store.connectSocket()
    socket().fireConnect()
    await store.selectRoom(1)

    store.disconnectSocket()
    socket().trigger('newMessage', message(11))

    expect(store.messages.filter((m) => m.id === 11)).toHaveLength(0)
  })

  it('leaves the open room and sends typing events over the shared socket', async () => {
    const store = useChatStore()
    store.connectSocket()
    socket().fireConnect()
    await store.selectRoom(4)

    store.emitTyping()
    store.disconnectSocket()

    expect(socket().sent('joinRoom')).toContainEqual({ roomId: 4 })
    expect(socket().sent('typing')).toContainEqual({ roomId: 4, isTyping: true })
    expect(socket().sent('leaveRoom')).toContainEqual({ roomId: 4 })
  })

  it('rejoins the open room after a reconnect', async () => {
    const store = useChatStore()
    store.connectSocket()
    socket().fireConnect()
    await store.selectRoom(4)
    socket().emitted.length = 0

    socket().trigger('disconnect')
    socket().fireConnect()

    expect(socket().sent('joinRoom')).toContainEqual({ roomId: 4 })
  })

  it('tracks typing and read receipts from the shared socket', async () => {
    const store = useChatStore()
    store.connectSocket()
    socket().fireConnect()
    await store.selectRoom(1)
    store.messages.push({ ...message(20), editedAt: null, deletedAt: null } as any)

    socket().trigger('userTyping', { roomId: 1, userId: 2, username: 'alice', isTyping: true })
    expect(store.currentRoomTypingUsers).toEqual(['alice'])

    socket().trigger('messagesRead', { roomId: 1, userId: 2 })
    expect(store.messages.find((m) => m.id === 20)?.readBy).toEqual([2])
  })
})
