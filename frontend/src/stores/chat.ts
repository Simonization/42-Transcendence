/**
 * Chat Store
 * Manages chat state with REST API + Socket.io for real-time updates
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { chatApi } from '../api/chat'
import { friendsApi } from '../api/friends'
import { getErrorMessage } from '../utils/error'
import { ChatType } from '../types'
import type { ChatRoom, Message, TypingUser } from '../types'
import {
  connectSocket as connectSharedSocket,
  getSocket,
  onSocketEvent,
  wsConnected as socketConnected,
} from '../services/socket'
import { useAuthStore } from './auth'


export const useChatStore = defineStore('chat', () => {
  
  const authStore = useAuthStore()
  const currentUserId = computed(() => Number(authStore.user?.id) || 0)

  const rooms = ref<ChatRoom[]>([])
  const activeRoomId = ref<number | null>(null)
  const messages = ref<Message[]>([])
  const isLoadingRooms = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  const error = ref('')
  const demoMode = ref(false)

  // Mirrors the shared connection (services/socket.ts) so the store exposes it as plain state.
  const wsConnected = ref(socketConnected.value)
  watch(socketConnected, (connected) => { wsConnected.value = connected })
  // Removers for this store's socket listeners, filled while the chat page is bound.
  let unbindHandlers: Array<() => void> = []

  const blockedUserIds = ref<Set<number>>(new Set())
  const typingUsers = ref<TypingUser[]>([])
  const typingTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const activeRoom = computed(() => rooms.value.find(r => r.id === activeRoomId.value) || null)
  const unreadCount = computed(() => rooms.value.filter(r => r.isUnread).length)
  const visibleRooms = computed(() => rooms.value.filter(r => {
    if (r.type !== 0) return true
    const partner = r.participants.find(p => p.id !== currentUserId.value)
    return !partner || !blockedUserIds.value.has(partner.id)
  }))
  const isActiveRoomBlocked = computed(() => {
    const room = activeRoom.value
    if (!room || room.type !== 0) return false
    const partner = room.participants.find(p => p.id !== currentUserId.value)
    return !!partner && blockedUserIds.value.has(partner.id)
  })
  const currentRoomTypingUsers = computed(() => typingUsers.value.filter(t => t.chatId === activeRoomId.value).map(t => t.username))

  const loadBlockedUsers = async () => {
    try {
      const blocks = await friendsApi.getBlocked()
      blockedUserIds.value = new Set(blocks.map(b => b.blocked.id))
    } catch {}
  }

  const blockUserInChat = async (targetId: number) => {
    try {
      await friendsApi.blockUser({ targetId })
      blockedUserIds.value = new Set([...blockedUserIds.value, targetId])
      if (isActiveRoomBlocked.value) {
        activeRoomId.value = null
        messages.value = []
      }
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to block user')
    }
  }

  const emitTyping = () => getSocket()?.emit('typing', { roomId: activeRoomId.value, isTyping: true })
  const emitStopTyping = () => getSocket()?.emit('typing', { roomId: activeRoomId.value, isTyping: false })
  const emitJoinRoom = (roomId: number) => getSocket()?.emit('joinRoom', { roomId })
  const emitLeaveRoom = (roomId: number) => getSocket()?.emit('leaveRoom', { roomId })
 
  /**
   * Fetch user's chat rooms
   */
  const fetchRooms = async () => {
	isLoadingRooms.value = true
	error.value = ''
	try {
	  const response = await chatApi.getRooms()
	  rooms.value = Array.isArray(response) ? response : []
	} catch (e) {
	  rooms.value = []
	  demoMode.value = true
	  error.value = getErrorMessage(e, 'Failed to load conversations')
	} finally {
	  isLoadingRooms.value = false
	}
  }

  /**
   * Select a room and load its messages
   */
const selectRoom = async (roomId: number) => {
    if (activeRoomId.value && activeRoomId.value !== roomId) emitLeaveRoom(activeRoomId.value)
    
    activeRoomId.value = roomId
    messages.value = []
    isLoadingMessages.value = true
    error.value = ''
    emitJoinRoom(roomId)

    try {
      const response = await chatApi.getMessages(roomId)
      if (activeRoomId.value !== roomId) return

      // The backend returns a plain array, newest first
      messages.value = [...response].reverse()

      await chatApi.markAsRead(roomId).catch(() => {})
      
      rooms.value = rooms.value.map(r => r.id === roomId ? { ...r, isUnread: false } : r)
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to load messages:", e)
      }
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
      
      const exists = messages.value.some(m => String(m.id) === String(msg.id))
      if (!exists) {
        messages.value.push(msg)
      }
      
      rooms.value = rooms.value.map(r => r.id === activeRoomId.value ? { ...r, lastMessage: msg } : r)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to send message')
    } finally {
      isSending.value = false
    }
  }

  /**
   * Create a new chat room
   */
  const createRoom = async (participantIds: number[], title?: string) => {
	error.value = ''
	try {
	  const room = await chatApi.createRoom({ participantIds, title })
	  // Refresh rooms to get full data
	  await fetchRooms()
	  await selectRoom(room.id)
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
   * Bind the chat page's listeners to the app's shared socket and make sure it is open. The
   * connection itself is owned by services/socket.ts (opened by the app shell); calling this
   * again while already bound does nothing.
   */
  const connectSocket = () => {
    connectSharedSocket()
    if (unbindHandlers.length) return

    const bind = (event: string, handler: (...args: any[]) => void) => {
      unbindHandlers.push(onSocketEvent(event, handler))
    }

    bind('connect', () => {
      // Resync after reconnect and rejoin active room for real-time updates.
      fetchRooms().catch(() => {})
      if (activeRoomId.value) {
        emitJoinRoom(activeRoomId.value)
      }
    })

    bind('newMessage', (payload: any) => {
      const targetChatId = payload.roomId ?? payload.chatId
      
      let senderObj = payload.sender
      if (!senderObj && activeRoom.value) {
        const found = activeRoom.value.participants.find((p: any) => 
          Number(p.userId || p.user?.id || p.id) === Number(payload.senderId)
        ) as any
        
        if (found) {
          senderObj = { id: payload.senderId, username: found.user?.username || found.username }
        }
      }
      const msg: Message = {
        id: payload.id, chatId: targetChatId, senderId: payload.senderId,
        content: payload.content, createdAt: payload.createdAt,
        editedAt: null, deletedAt: null, sender: senderObj,
      }
      
      if (Number(msg.chatId) === Number(activeRoomId.value) && !messages.value.some(m => String(m.id) === String(msg.id))) {
        messages.value.push(msg)
        
        if (Number(msg.senderId) !== currentUserId.value) {
          chatApi.markAsRead(msg.chatId).catch(() => {})
        }
      }
      
      rooms.value = rooms.value.map(r => r.id === msg.chatId 
        ? { ...r, lastMessage: msg, isUnread: (Number(msg.chatId) !== Number(activeRoomId.value) && Number(msg.senderId) !== currentUserId.value) ? true : r.isUnread } 
        : r
      )
    })

    bind('userTyping', (payload: any) => {
      const targetChatId = payload.roomId ?? payload.chatId
      const userId = payload.userId
      const isTyping = payload.isTyping
      
      typingUsers.value = typingUsers.value.filter(
        t => !(Number(t.userId) === Number(userId) && Number(t.chatId) === Number(targetChatId))
      )
      const timerKey = Number(userId) * 10000 + Number(targetChatId)
      const existing = typingTimers.get(timerKey)
      if (existing) clearTimeout(existing)

      if (isTyping) {
        let finalUsername = payload.username
        if (!finalUsername && activeRoom.value) {
          const found = activeRoom.value.participants.find((p: any) => 
            Number(p.userId || p.user?.id || p.id) === Number(userId)
          ) as any
          finalUsername = found?.user?.username || found?.username
        }
        finalUsername = finalUsername ?? `User ${userId}`

        typingUsers.value.push({ userId: Number(userId), username: finalUsername, chatId: Number(targetChatId) })
        typingTimers.set(timerKey, setTimeout(() => {
          typingUsers.value = typingUsers.value.filter(
            t => !(Number(t.userId) === Number(userId) && Number(t.chatId) === Number(targetChatId))
          )
          typingTimers.delete(timerKey)
        }, 3000))
      } else {
        typingTimers.delete(timerKey)
      }
    })

    bind('messagesRead', (payload: any) => {
      const targetChatId = payload.roomId ?? payload.chatId
      const userId = payload.userId
      
      if (Number(targetChatId) === Number(activeRoomId.value)) {
        messages.value.forEach(msg => {
          if (!msg.readBy) msg.readBy = []
          if (!msg.readBy.some(id => Number(id) === Number(userId))) {
            msg.readBy.push(Number(userId))
          }
        })
      }
    })
  }

  /**
   * Called when the chat page closes: leave the open room and stop listening. The shared socket
   * stays up; it belongs to the whole app (notifications, live pages), not to this page.
   */
  const disconnectSocket = () => {
    if (activeRoomId.value) emitLeaveRoom(activeRoomId.value)
    unbindHandlers.forEach((unbind) => unbind())
    unbindHandlers = []
  }

  return {
    rooms, activeRoomId, activeRoom, messages, isLoadingRooms, isLoadingMessages, isSending,
    error, unreadCount, demoMode, wsConnected, blockedUserIds, currentUserId, typingUsers,
    visibleRooms, isActiveRoomBlocked, currentRoomTypingUsers,
    loadBlockedUsers, blockUserInChat,
    emitTyping, emitStopTyping, emitJoinRoom, emitLeaveRoom,
    fetchRooms, selectRoom, sendMessage, createRoom, deleteMessage,
    connectSocket, disconnectSocket,
  }
})