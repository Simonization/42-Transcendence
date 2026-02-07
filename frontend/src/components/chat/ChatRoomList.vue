<script setup lang="ts">
import type { ChatRoom } from '../../types'

defineProps<{
  rooms: ChatRoom[]
  activeRoomId: number | null
  currentUserId: number
}>()

const emit = defineEmits<{
  select: [roomId: number]
}>()

const getRoomName = (room: ChatRoom, currentUserId: number): string => {
  if (room.title) return room.title
  // For DMs, show the other participant's name
  const other = room.participants.find(p => p.id !== currentUserId)
  return other?.username || 'Unknown'
}

const getPreview = (room: ChatRoom): string => {
  if (!room.lastMessage) return 'No messages yet'
  const content = room.lastMessage.content
  return content.length > 40 ? content.slice(0, 40) + '...' : content
}

const getTime = (room: ChatRoom): string => {
  if (!room.lastMessage) return ''
  const d = new Date(room.lastMessage.createdAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="room-list">
    <div v-if="rooms.length === 0" class="empty-state">
      <p class="text-tertiary">No conversations</p>
    </div>

    <button
      v-for="room in rooms"
      :key="room.id"
      class="room-item"
      :class="{ active: room.id === activeRoomId, unread: room.isUnread }"
      @click="emit('select', room.id)"
    >
      <div class="room-avatar">
        {{ getRoomName(room, currentUserId).slice(0, 2).toUpperCase() }}
      </div>
      <div class="room-info">
        <div class="room-top">
          <span class="room-name">{{ getRoomName(room, currentUserId) }}</span>
          <span class="room-time">{{ getTime(room) }}</span>
        </div>
        <p class="room-preview">{{ getPreview(room) }}</p>
      </div>
      <div v-if="room.isUnread" class="unread-dot"></div>
    </button>
  </div>
</template>

<style scoped>
.room-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.empty-state {
  padding: var(--space-6);
  text-align: center;
}

.room-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  transition: background var(--duration-fast) var(--ease-default);
  width: 100%;
}

.room-item:hover {
  background: var(--bg-hover);
}

.room-item.active {
  background: var(--bg-selected);
}

.room-avatar {
  width: 40px;
  height: 40px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.room-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-item.unread .room-name {
  font-weight: var(--font-bold);
}

.room-time {
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.room-preview {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: var(--space-1) 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-dot {
  width: 8px;
  height: 8px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: var(--accent-primary);
  flex-shrink: 0;
}
</style>
