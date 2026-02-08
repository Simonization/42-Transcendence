/**
 * Notification System Composable
 * Singleton pattern for managing toast notifications across the app
 * Type-safe notification handling with auto-dismiss
 */

import { ref, computed } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration: number
  createdAt: number
}

// Singleton state - shared across all component instances
const notifications = ref<Notification[]>([])
const nextId = ref(0)

// Configuration
const MAX_NOTIFICATIONS = 3
const DEFAULT_DURATION = 3000 // 3 seconds

/**
 * Add a new notification
 * @param type - Notification type (success, error, warning, info)
 * @param message - Notification message
 * @param duration - Time in milliseconds before auto-dismiss (0 = no auto-dismiss)
 */
function addNotification(
  type: NotificationType,
  message: string,
  duration: number = DEFAULT_DURATION
): string {
  const id = `notification-${nextId.value++}`

  // Trim to max notifications if limit reached
  if (notifications.value.length >= MAX_NOTIFICATIONS) {
    // Remove oldest notification (first one)
    removeNotification(notifications.value[0].id)
  }

  const notification: Notification = {
    id,
    type,
    message,
    duration,
    createdAt: Date.now(),
  }

  notifications.value.push(notification)

  // Auto-dismiss if duration is set
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }

  return id
}

/**
 * Remove a notification by ID
 */
function removeNotification(id: string): void {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

/**
 * Clear all notifications
 */
function clearAll(): void {
  notifications.value = []
}

/**
 * Convenience methods for specific notification types
 */
function success(message: string, duration?: number): string {
  return addNotification('success', message, duration)
}

function error(message: string, duration?: number): string {
  return addNotification('error', message, duration)
}

function warning(message: string, duration?: number): string {
  return addNotification('warning', message, duration)
}

function info(message: string, duration?: number): string {
  return addNotification('info', message, duration)
}

/**
 * useNotifications composable
 * Use in components to manage notifications
 */
export function useNotifications() {
  return {
    // State
    notifications: computed(() => notifications.value),

    // Methods
    addNotification,
    removeNotification,
    clearAll,

    // Convenience methods
    success,
    error,
    warning,
    info,
  }
}
