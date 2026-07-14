/**
 * Chat Store
 * Manages chat state with REST API + Socket.io for real-time updates
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '../api/chat'
import { friendsApi } from '../api/friends'
import { getAccessToken } from '../api'
import { getErrorMessage } from '../utils/error'
import { ChatType } from '../types'
import type { ChatRoom, Message, TypingUser } from '../types'
import { io, Socket } from 'socket.io-client' 
import { useAuthStore } from './auth'

const DEMO_ROOMS: ChatRoom[] = [] 
const DEMO_MESSAGES: Message[] = [] 


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

  let socket: Socket | null = null
  const wsConnected = ref(false)

  const blockedUserIds = ref<Set<number>>(new Set())
  // const currentUserId = ref<number>(0)
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

  const setCurrentUser = (id: number) => { currentUserId.value = id }

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

  const emitTyping = () => socket?.emit('typing', { roomId: activeRoomId.value, isTyping: true })
  const emitStopTyping = () => socket?.emit('typing', { roomId: activeRoomId.value, isTyping: false })
  const emitJoinRoom = (roomId: number) => socket?.emit('joinRoom', { roomId })
  const emitLeaveRoom = (roomId: number) => socket?.emit('leaveRoom', { roomId })
  const emitMarkRead = (roomId: number) => socket?.emit('markRead', { roomId })
 
  /**
   * Fetch user's chat rooms
   */
  const fetchRooms = async () => {
	isLoadingRooms.value = true
	error.value = ''
	try {
	  rooms.value = await chatApi.getRooms()
	} catch (e) {
	  rooms.value = DEMO_ROOMS
	  demoMode.value = true
	  error.value = ''
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

      const rawMessages = Array.isArray(response) ? response : (response?.data || [])
      messages.value = [...rawMessages].reverse()

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

  // Friend activity callback registry
  const friendActivityCallbacks: Array<() => void> = []
  const onFriendActivity = (cb: () => void) => {
    friendActivityCallbacks.push(cb)
  }

  const connectSocket = () => {
    const token = getAccessToken()
    if (!token || socket?.connected) return

    socket = io('/', { 
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      wsConnected.value = true
      if (import.meta.env.DEV) {
        console.log('Socket.io connected!')
      }

      // Resync after reconnect and rejoin active room for real-time updates.
      fetchRooms().catch(() => {})
      if (activeRoomId.value) {
        emitJoinRoom(activeRoomId.value)
      }
    })

    socket.on('disconnect', () => {
      wsConnected.value = false
      if (import.meta.env.DEV) {
        console.log('Socket.io disconnected.')
      }
    })

    socket.on('friendActivity', () => {
      if (import.meta.env.DEV) {
        console.log('🔥 Soket Sinyali Geldi: friendActivity!')
      }
      friendActivityCallbacks.forEach(cb => cb())
    })

    socket.on('newMessage', (payload: any) => {
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

    socket.on('userTyping', (payload: any) => {
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

    socket.on('messagesRead', (payload: any) => {
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

  const disconnectSocket = () => {
    if (activeRoomId.value) emitLeaveRoom(activeRoomId.value)
    if (socket) {
      socket.disconnect()
      socket = null
    }
    wsConnected.value = false
  }

  return {
    rooms, activeRoomId, activeRoom, messages, isLoadingRooms, isLoadingMessages, isSending,
    error, unreadCount, demoMode, wsConnected, blockedUserIds, currentUserId, typingUsers,
    visibleRooms, isActiveRoomBlocked, currentRoomTypingUsers,
    setCurrentUser, loadBlockedUsers, blockUserInChat, onFriendActivity,
    emitTyping, emitStopTyping, emitJoinRoom, emitLeaveRoom, emitMarkRead,
    fetchRooms, selectRoom, sendMessage, createRoom, deleteMessage,
    connectSocket, disconnectSocket,
  }
})