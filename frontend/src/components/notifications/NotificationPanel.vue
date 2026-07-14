<script setup lang="ts">
/**
 * Notification Panel
 * Dropdown panel showing notification list with actions
 */

import { computed } from 'vue'
import type { Notification } from '../../api/notifications'

interface Props {
  notifications: Notification[]
  isLoading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'markRead', id: number): void
  (e: 'markAllRead'): void
  (e: 'delete', id: number): void
  (e: 'close'): void
  (e: 'teamInviteAccept', notif: Notification): void
}>()

const hasUnread = computed(() =>
  props.notifications.some(n => !n.readAt)
)

const typeIcon = (type: Notification['type']): string => {
  switch (type) {
    case 'friend_request': return '👥'
    case 'match_result': return '🏆'
    case 'system': return '⚙️'
    case 'bot_message': return '🤖'
    case 'team_invite': return '🎮'
    case 'info':
    default: return 'ℹ️'
  }
}

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
</script>

<template>
  <div class="notif-panel glass-panel">
    <div class="panel-header">
      <span class="panel-title">{{ $t('notifications.title') }}</span>
      <button
        v-if="hasUnread"
        class="mark-all-btn"
        @click="emit('markAllRead')"
      >
        {{ $t('notifications.markAllRead') }}
      </button>
    </div>

    <div v-if="isLoading" class="panel-loading">
      {{ $t('common.loading') }}
    </div>

    <div v-else-if="notifications.length === 0" class="panel-empty">
      {{ $t('notifications.empty') }}
    </div>

    <ul v-else class="notif-list">
      <li
        v-for="notif in notifications"
        :key="notif.id"
        class="notif-item"
        :class="{ 'notif-unread': !notif.readAt }"
      >
        <span class="notif-icon">{{ typeIcon(notif.type) }}</span>
        <div class="notif-body">
          <p v-if="notif.title" class="notif-title-text">{{ notif.title }}</p>
          <p class="notif-message">{{ notif.body }}</p>
          <span class="notif-time">{{ timeAgo(notif.createdAt) }}</span>
        </div>
        <div class="notif-actions">
          <button
            v-if="!notif.readAt && notif.type === 'team_invite'"
            class="notif-action-btn notif-accept-btn"
            :title="$t('common.accept')"
            @click="emit('teamInviteAccept', notif)"
          >
            &#10003;
          </button>
          <button
            v-else-if="!notif.readAt"
            class="notif-action-btn"
            :title="$t('notifications.markRead')"
            @click="emit('markRead', notif.id)"
          >
            &#10003;
          </button>
          <button
            class="notif-action-btn notif-delete-btn"
            :title="$t('notifications.delete')"
            @click="emit('delete', notif.id)"
          >
            &times;
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.notif-panel {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  border: var(--hud-border) solid var(--glass-border);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.panel-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  text-transform: uppercase;
}

.mark-all-btn {
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--accent-primary);
  background: none;
  border: none;
  cursor: pointer;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.mark-all-btn:hover {
  opacity: 0.7;
}

.panel-loading,
.panel-empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--duration-fast) var(--ease-default);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: var(--bg-hover);
}

.notif-unread {
  background: var(--bg-selected);
}

.notif-unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-primary);
}

.notif-item {
  position: relative;
}

.notif-icon {
  font-size: var(--text-sm);
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title-text {
  margin: 0 0 2px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.notif-message {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notif-time {
  font-size: 10px;
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.notif-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.notif-action-btn {
  padding: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-default);
  line-height: 1;
}

.notif-action-btn:hover {
  color: var(--accent-primary);
}

.notif-delete-btn:hover {
  color: var(--color-error);
}

.notif-accept-btn:hover {
  color: var(--color-success, #4ade80);
}

@media (max-width: 768px) {
  .notif-panel {
    position: fixed;
    top: 60px;
    right: var(--space-2);
    left: var(--space-2);
    width: auto;
    max-height: 60vh;
  }
}
</style>
