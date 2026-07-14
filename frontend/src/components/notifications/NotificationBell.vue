<script setup lang="ts">
/**
 * Notification Bell
 * Header bell icon with unread badge — opens notification panel on click
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { notificationsApi } from '../../api/notifications'
import { teamsApi } from '../../api/teams'
import { useChat } from '../../composables/useChat'
import type { Notification, NotificationType } from '../../api/notifications'
import NotificationPanel from './NotificationPanel.vue'

const router = useRouter()

const unreadCount = ref(0)
const notifications = ref<Notification[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

const { onNotification } = useChat()

const fetchUnreadCount = async () => {
  try {
    const res = await notificationsApi.getUnreadCount()
    unreadCount.value = res.count
  } catch {
    // Silently fail — non-critical
  }
}

const fetchNotifications = async () => {
  isLoading.value = true
  try {
    const res = await notificationsApi.getNotifications({ limit: 20 })
    notifications.value = res.notifications
  } catch {
    notifications.value = []
  } finally {
    isLoading.value = false
  }
}

const togglePanel = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await fetchNotifications()
  }
}

const closePanel = () => {
  isOpen.value = false
}

const handleMarkRead = async (id: number) => {
  try {
    await notificationsApi.markAsRead(id)
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.readAt = new Date().toISOString()
    if (unreadCount.value > 0) unreadCount.value--
  } catch {
    // Silently fail
  }
}

const handleMarkAllRead = async () => {
  try {
    await notificationsApi.markAllAsRead()
    notifications.value.forEach(n => {
      if (!n.readAt) n.readAt = new Date().toISOString()
    })
    unreadCount.value = 0
  } catch {
    // Silently fail
  }
}

const handleDelete = async (id: number) => {
  try {
    await notificationsApi.deleteNotification(id)
    const wasUnread = !notifications.value.find(n => n.id === id)?.readAt
    notifications.value = notifications.value.filter(n => n.id !== id)
    if (wasUnread && unreadCount.value > 0) unreadCount.value--
  } catch {
    // Silently fail
  }
}

const handleTeamInviteAccept = async (notif: Notification) => {
  try {
    const data = notif.data as { invitationId: number; tournamentId: number } | undefined
    if (!data?.invitationId) return
    await teamsApi.acceptInvitation(data.invitationId)
    await notificationsApi.markAsRead(notif.id)
    notifications.value = notifications.value.filter(n => n.id !== notif.id)
    if (!notif.readAt && unreadCount.value > 0) unreadCount.value--
    closePanel()
    if (data.tournamentId) {
      router.push(`/menu/tournaments/${data.tournamentId}/team`)
    }
  } catch {
    // Silently fail — user stays on current page
  }
}

/** Called externally when a socket notification arrives */
const onSocketNotification = (notif: Notification) => {
  notifications.value.unshift(notif)
  unreadCount.value++
}

// Close panel on outside click
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isOpen.value && !target.closest('.notif-bell-wrapper')) {
    closePanel()
  }
}

onMounted(() => {
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 30000) // Poll every 30s
  document.addEventListener('click', handleOutsideClick)
  
  onNotification((data: Record<string, unknown>) => {
    // Backend sends: { id, type, title, body, data, createdAt, readAt }
    const notif: Notification = {
      id: data.id as number,
      userId: 0, // will be updated when send from API
      type: data.type as NotificationType,
      title: data.title as string | undefined,
      body: data.body as string,
      data: data.data as Record<string, unknown> | undefined,
      createdAt: data.createdAt as string,
      updatedAt: data.createdAt as string, // Use createdAt as init
      readAt: data.readAt as string | null | undefined,
      deliveredAt: new Date().toISOString(),
    }
    onSocketNotification(notif)
  })
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', handleOutsideClick)
})

defineExpose({ onSocketNotification, fetchUnreadCount })
</script>

<template>
  <div class="notif-bell-wrapper">
    <button
      class="notif-bell-btn"
      :title="$t('notifications.bell')"
      @click.stop="togglePanel"
    >
      <span class="bell-icon">&#128276;</span>
      <span v-if="unreadCount > 0" class="notif-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <Transition name="panel-slide">
      <NotificationPanel
        v-if="isOpen"
        :notifications="notifications"
        :is-loading="isLoading"
        @mark-read="handleMarkRead"
        @mark-all-read="handleMarkAllRead"
        @delete="handleDelete"
        @close="closePanel"
        @team-invite-accept="handleTeamInviteAccept"
      />
    </Transition>
  </div>
</template>

<style scoped>
.notif-bell-wrapper {
  position: relative;
}

.notif-bell-btn {
  position: relative;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-base);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  -webkit-clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
  clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
}

.notif-bell-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.bell-icon {
  font-size: var(--text-sm);
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--font-bold);
  background: var(--color-error);
  color: var(--bg-primary);
  border-radius: 9px;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.panel-slide-enter-active {
  transition: all var(--duration-normal) var(--ease-out);
}
.panel-slide-leave-active {
  transition: all var(--duration-fast) var(--ease-in);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
