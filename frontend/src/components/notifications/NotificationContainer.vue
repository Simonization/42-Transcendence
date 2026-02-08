<script setup lang="ts">
/**
 * Notification Container Component
 * Displays all active notifications in a fixed container
 * Renders NotificationToast for each notification
 */

import { useNotificationsStore } from '../../stores/notifications'
import NotificationToast from './NotificationToast.vue'

const notificationsStore = useNotificationsStore()
const { notifications, removeNotification } = notificationsStore
</script>

<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="toast-list" tag="div">
        <NotificationToast
          v-for="notification in notifications"
          :key="notification.id"
          :type="notification.type"
          :message="notification.message"
          :duration="notification.duration"
          @dismiss="removeNotification(notification.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  pointer-events: none;
}

.notification-container > * {
  pointer-events: auto;
}

/* Transition Group */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 200ms ease-out;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-list-move {
  transition: transform 200ms ease-out;
}

/* Responsive - Mobile */
@media (max-width: 768px) {
  .notification-container {
    left: var(--space-4);
    right: var(--space-4);
    top: var(--space-2);
  }
}

@media (max-width: 480px) {
  .notification-container {
    left: 0;
    right: 0;
    top: 0;
    gap: 0;
    border-radius: 0;
  }
}
</style>
