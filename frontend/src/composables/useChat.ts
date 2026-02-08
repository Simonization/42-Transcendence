/**
 * Chat Composable
 * Manages chat state with REST API + Socket.io for real-time updates
 *
 * Callers must call `disconnectSocket()` on component unmount to prevent orphaned connections.
 */

import { ref, computed } from 'vue'
import { chatApi } from '../api/chat'
import { getAccessToken } from '../api'
import { getErrorMessage } from '../utils/error'
import type { ChatRoom, Message } from '../types'

const MAX_MESSAGES = 500
const messageCache = new Map<number, Message[]>()

export function useChat() {
  const rooms = ref<ChatRoom[]>([])
  const activeRoomId = ref<number | null>(null)
  const messages = ref<Message[]>([])
  const isLoadingRooms = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  const error = ref('')

  // Socket.io
  let socket: WebSocket | null = null
  const wsConnected = ref(false)

  const activeRoom = computed(() =>
    rooms.value.find(r => r.id === activeRoomId.value) || null
  )

  const unreadCount = computed(() =>
    rooms.value.filter(r => r.isUnread).length
  )

  /**
   * Fetch user's chat rooms
   */
  const fetchRooms = async () => {
    isLoadingRooms.value = true
    error.value = ''
    try {
      rooms.value = await chatApi.getRooms()
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load conversations')
    } finally {
      isLoadingRooms.value = false
    }
  }

  /**
   * Select a room and load its messages
   */
  const selectRoom = async (roomId: number) => {
    activeRoomId.value = roomId

    // Check cache first
    if (messageCache.has(roomId)) {
      messages.value = messageCache.get(roomId)!
      // Still mark as read, but don't refetch
      await chatApi.markAsRead(roomId).catch(() => {})
      // Update local unread state
      rooms.value = rooms.value.map(r =>
        r.id === roomId ? { ...r, isUnread: false } : r
      )
      return
    }

    // If not cached, fetch from API
    messages.value = []
    isLoadingMessages.value = true
    error.value = ''
    try {
      const msgs = await chatApi.getMessages(roomId)
      // Guard against stale response
      if (activeRoomId.value !== roomId) return
      // API returns newest first, reverse for display (oldest at top)
      const reversedMsgs = msgs.reverse()
      messages.value = reversedMsgs

      // Cache the result
      messageCache.set(roomId, reversedMsgs)

      // Mark as read
      await chatApi.markAsRead(roomId).catch(() => {})
      // Update local unread state
      rooms.value = rooms.value.map(r =>
        r.id === roomId ? { ...r, isUnread: false } : r
      )
    } catch (e) {
      if (activeRoomId.value !== roomId) return
      error.value = getErrorMessage(e, 'Failed to load messages')
    } finally {
      isLoadingMessages.value = false
    }
  }

  /**
   * Send a message to the active room
   */
  const sendMessage = async (content: string) => {
    if (!activeRoomId.value || !content.trim()) return
    isSending.value = true
    error.value = ''
    try {
      const msg = await chatApi.sendMessage({
        chatId: activeRoomId.value,
        content: content.trim(),
      })
      messages.value.push(msg)
      // Sliding window: keep only last 500 messages
      if (messages.value.length > MAX_MESSAGES) {
        messages.value = messages.value.slice(-MAX_MESSAGES)
      }
      // Update cache with new message
      if (messageCache.has(activeRoomId.value)) {
        messageCache.set(activeRoomId.value, messages.value)
      }
      // Update room's last message
      rooms.value = rooms.value.map(r =>
        r.id === activeRoomId.value ? { ...r, lastMessage: msg } : r
      )
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to send message')
    } finally {
      isSending.value = false
    }
  }

  /**
   * Create a new chat room
   */
  const createRoom = async (userIds: number[], title?: string) => {
    error.value = ''
    try {
      const room = await chatApi.createRoom({ userIds, title })
      // Refresh rooms to get full data
      await fetchRooms()
      activeRoomId.value = room.id
      return room
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to create conversation')
      return null
    }
  }

  /**
   * Delete a message
   */
  const deleteMessage = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId)
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        msg.content = 'This message was deleted'
        msg.deletedAt = new Date().toISOString()
      }
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to delete message')
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectSocket = () => {
    const token = getAccessToken()
    if (!token || socket) return

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(
        `${protocol}//${window.location.host}/socket.io/?EIO=4&transport=websocket`
      )

      socket.onopen = () => {
        wsConnected.value = true
      }

      socket.onmessage = (event) => {
        // Socket.io protocol: messages start with type prefix
        const data = event.data as string
        if (data.startsWith('42')) {
          try {
            const parsed = JSON.parse(data.slice(2))
            if (parsed[0] === 'message' && parsed[1]) {
              const msg = parsed[1] as Message
              // Only add if it's for the active room and not already present
              if (msg.chatId === activeRoomId.value) {
                const exists = messages.value.some(m => m.id === msg.id)
                if (!exists) {
                  messages.value.push(msg)
                  // Sliding window: keep only last 500 messages
                  if (messages.value.length > MAX_MESSAGES) {
                    messages.value = messages.value.slice(-MAX_MESSAGES)
                  }
                  // Update cache with new message
                  if (messageCache.has(activeRoomId.value)) {
                    messageCache.set(activeRoomId.value, messages.value)
                  }
                }
              }
              // Update room list
              rooms.value = rooms.value.map(r =>
                r.id === msg.chatId
                  ? {
                      ...r,
                      lastMessage: msg,
                      isUnread: msg.chatId !== activeRoomId.value ? true : r.isUnread
                    }
                  : r
              )
            }
          } catch {
            // Ignore parse errors from socket.io protocol messages
          }
        }
      }

      socket.onclose = () => {
        wsConnected.value = false
        socket = null
      }

      socket.onerror = () => {
        wsConnected.value = false
      }
    } catch {
      wsConnected.value = false
    }
  }

  /**
   * Disconnect WebSocket
   */
  const disconnectSocket = () => {
    socket?.close()
    socket = null
    wsConnected.value = false
  }

  return {
    rooms,
    activeRoomId,
    activeRoom,
    messages,
    isLoadingRooms,
    isLoadingMessages,
    isSending,
    error,
    unreadCount,
    wsConnected,
    fetchRooms,
    selectRoom,
    sendMessage,
    createRoom,
    deleteMessage,
    connectSocket,
    disconnectSocket,
  }
}
