import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import { chatApi } from '../api/chat'
import { getAccessToken } from '../api'
import { getErrorMessage } from '../utils/error'
import type { ChatRoom, Message } from '../types'

const rooms = ref<ChatRoom[]>([])
const activeRoomId = ref<number | null>(null)
const messages = ref<Message[]>([])
const isLoadingRooms = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const error = ref('')

const announcements = ref<{ id: number, content: string, createdAt: string }[]>([])
const socket = ref<Socket | null>(null)
const wsConnected = ref(false)
const uptime = ref('0.0')

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
			rooms.value = await chatApi.getRooms()
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
		try {
			const msgs = await chatApi.getMessages(roomId)
			if (activeRoomId.value !== roomId) return

			messages.value = msgs.reverse()
			await chatApi.markAsRead(roomId).catch(() => { })
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

	const sendMessage = async (content: string) => {
		if (!activeRoomId.value || !content.trim()) return
		isSending.value = true
		error.value = ''
		try {
			const msg = await chatApi.sendMessage({
				chatId: activeRoomId.value,
				content: content.trim(),
			})

			const exists = messages.value.some(m => m.id === msg.id)
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

	const createRoom = async (userIds: number[], title?: string) => {
		error.value = ''
		try {
			const room = await chatApi.createRoom({ userIds, title })
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

	const connectSocket = () => {
		const token = getAccessToken()
		if (!token || (socket.value && socket.value.connected))
			return
		socket.value = io('/', {
			path: '/socket.io/',
			transports: ['websocket'],
			auth: {
				token: token
			},
			reconnection: true
		})

		socket.value.on('connect', () => {
			console.log('Socket.IO connected, ID:', socket.value?.id)
			wsConnected.value = true
		})

		socket.value.on('disconnect', () => {
			console.log('Socket.IO disconnected.')
			wsConnected.value = false
		})

		socket.value.on('message', (msg: any) => {
			if (typeof msg === 'object' && msg !== null && msg.chatId) {
				if (msg.chatId === activeRoomId.value) {
					const exists = messages.value.some(m => m.id === msg.id)
					if (!exists) messages.value.push(msg)
					const roomIdx = rooms.value.findIndex(r => r.id === msg.chatId)
					if (roomIdx !== -1) rooms.value[roomIdx] = { ...rooms.value[roomIdx], lastMessage: msg }
				} else {
					const roomIdx = rooms.value.findIndex(r => r.id === msg.chatId)
					if (roomIdx !== -1) rooms.value[roomIdx] = { ...rooms.value[roomIdx], isUnread: true }
				}
			} else {
				console.log('System Message:', msg)
			}
		})

		socket.value.on('connect_error', (err: Error) => {
			console.error('Socket connection error:', err.message)
			wsConnected.value = false
		})

		socket.value.on('time-pulse', (serverTime: string) => {
			uptime.value = serverTime
		})

		socket.value.on('announcement', (data: any) => {
			announcements.value.unshift(data)

			if (announcements.value.length > 5) {
				announcements.value.pop()
			}
		})
	}

	const sendAnnouncement = (text: string) => {
		if (socket.value && text.trim()) {
			socket.value.emit('create-announcement', { message: text })
		}
	}

	const disconnectSocket = () => {
		if (socket.value) {
			socket.value.disconnect()
			socket.value = null
			wsConnected.value = false
		}
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
		announcements,
		socket,
		fetchRooms,
		selectRoom,
		sendMessage,
		createRoom,
		deleteMessage,
		connectSocket,
		disconnectSocket,
		sendAnnouncement,
	}
}