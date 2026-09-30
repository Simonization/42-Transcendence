import { ref, computed } from 'vue'
import { chatApi } from '../api/chat'
import { clearTokens } from '../api'
import {
    connectSocket as connectSharedSocket,
    disconnectSocket as disconnectSharedSocket,
    getSocket,
    onSocketEvent,
    wsConnected,
} from '../services/socket'
import { getErrorMessage } from '../utils/error'
import { useApiLogger } from './useApiLogger'
import type { ChatRoom, Message } from '../types'

const rooms = ref<ChatRoom[]>([])
const activeRoomId = ref<number | null>(null)
const messages = ref<Message[]>([])
const isLoadingRooms = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const error = ref('')

const uptime = ref('0.0')
let handlersRegistered = false
const friendActivityCallbacks: Array<() => void> = []
const notificationCallbacks: Array<(data: Record<string, unknown>) => void> = []

export function useChat() {
    const activeRoom = computed(() =>
        rooms.value.find(r => r.id === activeRoomId.value) || null
    )

    const unreadCount = computed(() =>
        rooms.value.filter(r => r.isUnread).length
    )

    const fetchRooms = async () => {
        isLoadingRooms.value = true
        error.value = ''
        try {
            const response = await chatApi.getRooms()
            // rooms is module-scoped, so a non-array response would break every later read of it.
            rooms.value = Array.isArray(response) ? response : []
        } catch (e) {
            error.value = getErrorMessage(e, 'Failed to load conversations')
        } finally {
            isLoadingRooms.value = false
        }
    }

    const selectRoom = async (roomId: number) => {
        activeRoomId.value = roomId
        messages.value = []
        isLoadingMessages.value = true
        error.value = ''

        // Join the socket.io room to receive real-time messages
        const socket = getSocket()
        if (socket && socket.connected) {
            socket.emit('joinRoom', { roomId })
        }

        try {
            const response = await chatApi.getMessages(roomId)
            if (activeRoomId.value !== roomId) return

            // The backend returns a plain array, newest first
            messages.value = [...response].reverse()

            await chatApi.markAsRead(roomId).catch(() => { })
            rooms.value = rooms.value.map(r =>
                r.id === roomId ? { ...r, isUnread: false } : r
            )
        } catch (e) {
            if (import.meta.env.DEV) {
                console.error("Error: Cannot bring messages", e)
            }
            if (activeRoomId.value !== roomId) return
            error.value = getErrorMessage(e, 'Failed to load messages')
        } finally {
            isLoadingMessages.value = false
        }
    }

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
            rooms.value = rooms.value.map(r =>
                r.id === activeRoomId.value ? { ...r, lastMessage: msg } : r
            )
        } catch (e) {
            error.value = getErrorMessage(e, 'Failed to send message')
        } finally {
            isSending.value = false
        }
    }

    const createRoom = async (participantIds: number[], title?: string) => {
        error.value = ''
        try {
            const room = await chatApi.createRoom({ participantIds, title })
            await fetchRooms()
            activeRoomId.value = room.id
            return room
        } catch (e) {
            error.value = getErrorMessage(e, 'Failed to create conversation')
            return null
        }
    }

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
     * Listeners for the app shell (rooms, notifications, friend activity, forced logout). Bound
     * through the shared socket service, so they follow the connection across reconnects and
     * across logout/login. Registered once for the lifetime of the page.
     */
    const registerSocketHandlers = () => {
        const { addWsLog } = useApiLogger()

        onSocketEvent('connect', () => {
            addWsLog({ method: 'EVENT', endpoint: 'connect', direction: 'in' })
            // Sync rooms after (re)connect to reflect any missed messages.
            fetchRooms().catch(() => { })

            // Rejoin currently opened room after reconnect.
            if (activeRoomId.value) {
                getSocket()?.emit('joinRoom', { roomId: activeRoomId.value })
            }
        })

        onSocketEvent('disconnect', () => {
            addWsLog({ method: 'EVENT', endpoint: 'disconnect', direction: 'in' })
        })

        onSocketEvent('friendActivity', (payload: Record<string, unknown>) => {
            addWsLog({ method: 'EVENT', endpoint: 'friendActivity', direction: 'in', responseBody: payload })
            friendActivityCallbacks.forEach(cb => cb())
        })

        onSocketEvent('newMessage', (payload: Record<string, unknown>) => {
            addWsLog({ method: 'EVENT', endpoint: 'newMessage', direction: 'in', responseBody: payload })
            if (typeof payload === 'object' && payload !== null) {
                const roomId = (payload.roomId ?? payload.chatId) as number
                const msg: Message = {
                    id: payload.id as number,
                    chatId: roomId,
                    senderId: payload.senderId as number,
                    content: payload.content as string,
                    createdAt: payload.createdAt as string,
                    editedAt: null,
                    deletedAt: null,
                    sender: payload.sender as { id: number; username: string } | undefined,
                }
                if (msg.chatId === activeRoomId.value) {
                    const exists = messages.value.some(m => String(m.id) === String(msg.id))
                    if (!exists) messages.value.push(msg)
                    const roomIdx = rooms.value.findIndex(r => r.id === msg.chatId)
                    if (roomIdx !== -1) rooms.value[roomIdx] = { ...rooms.value[roomIdx], lastMessage: msg }
                } else {
                    const roomIdx = rooms.value.findIndex(r => r.id === msg.chatId)
                    if (roomIdx !== -1) {
                        rooms.value[roomIdx] = {
                            ...rooms.value[roomIdx],
                            lastMessage: msg,
                            isUnread: true,
                        }
                    } else {
                        // A new/private room can arrive through socket before local cache knows it.
                        fetchRooms().catch(() => { })
                    }
                }
            }
        })

        onSocketEvent('connect_error', () => {
            addWsLog({ method: 'EVENT', endpoint: 'connect_error', direction: 'in' })
        })

        onSocketEvent('time-pulse', (serverTime: string) => {
            uptime.value = serverTime
            addWsLog({ method: 'EVENT', endpoint: 'time-pulse', direction: 'in', responseBody: serverTime })
        })

        onSocketEvent('notification', (data: Record<string, unknown>) => {
            addWsLog({ method: 'EVENT', endpoint: 'notification', direction: 'in', responseBody: data })
            notificationCallbacks.forEach(cb => cb(data))
        })

        onSocketEvent('force-logout', () => {
            addWsLog({ method: 'EVENT', endpoint: 'force-logout', direction: 'in' })
            clearTokens()
            window.location.href = '/auth'
        })
    }

    /** Make sure the one shared connection is open (idempotent; needs an access token). */
    const connectSocket = () => {
        if (!handlersRegistered) {
            handlersRegistered = true
            registerSocketHandlers()
        }
        connectSharedSocket()
    }

    const onNotification = (cb: (data: Record<string, unknown>) => void) => {
        if (!notificationCallbacks.includes(cb)) {
            notificationCallbacks.push(cb)
        }
    }

    const onFriendActivity = (cb: () => void) => {
        if (!friendActivityCallbacks.includes(cb)) {
            friendActivityCallbacks.push(cb)
        }
    }

    /** Close the shared connection and reset chat state. The session owner (logout) calls this. */
    const disconnectSocket = () => {
        disconnectSharedSocket()
        uptime.value = '0.0'
        activeRoomId.value = null
        messages.value = []
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
        uptime,
        fetchRooms,
        selectRoom,
        sendMessage,
        createRoom,
        deleteMessage,
        connectSocket,
        disconnectSocket,
        onNotification,
        onFriendActivity,
    }
}