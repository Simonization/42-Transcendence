<script setup lang="ts">
/**
 * Notification Toast Component
 * Displays a single notification with type-specific styling
 */

import { computed } from 'vue'
import type { NotificationType } from '../../stores/notifications'

interface Props {
  type: NotificationType
  message: string
  duration: number
  onDismiss: () => void
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3000,
})

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '!'
    case 'info':
      return 'ℹ'
    default:
      return '•'
  }
})

const getTypeClass = (type: NotificationType) => {
  return {
    'toast-success': type === 'success',
    'toast-error': type === 'error',
    'toast-warning': type === 'warning',
    'toast-info': type === 'info',
  }
}

// Progress percentage for animation
const progressPercentage = computed(() => {
  if (props.duration === 0) return 100
  return 100
})
</script>

<template>
  <Transition name="toast-slide">
    <div class="notification-toast" :class="getTypeClass(type)">
      <!-- Content -->
      <div class="toast-content">
        <span class="toast-icon">{{ icon }}</span>
        <span class="toast-message">{{ message }}</span>
      </div>

      <!-- Dismiss Button -->
      <button class="toast-close" @click="onDismiss" :aria-label="$t('notifications.closeNotification')">
        ✕
      </button>

      <!-- Progress Bar (animated) -->
      <div v-if="duration > 0" class="toast-progress">
        <div
          class="toast-progress-bar"
          :style="{ animationDuration: `${duration}ms` }"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notification-toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  border-left: 3px solid var(--accent-primary);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  max-width: 400px;
  min-width: 280px;
  animation: toast-enter 200ms ease-out;
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Type Variants */
.toast-success {
  border-left-color: var(--color-success);
}

.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error {
  border-left-color: var(--color-error);
}

.toast-error .toast-icon {
  color: var(--color-error);
}

.toast-warning {
  border-left-color: var(--color-warning);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info {
  border-left-color: var(--color-info);
}

.toast-info .toast-icon {
  color: var(--color-info);
}

/* Content */
.toast-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

.toast-icon {
  font-weight: var(--font-bold);
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.toast-message {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: var(--leading-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Close Button */
.toast-close {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--duration-fast) var(--ease-default);
  font-size: var(--text-sm);
}

.toast-close:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.toast-close:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Progress Bar */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  animation: progress-shrink linear forwards;
}

@keyframes progress-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Animations */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 200ms ease-out;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* Responsive */
@media (max-width: 480px) {
  .notification-toast {
    min-width: 100%;
    max-width: 100%;
    margin: 0 var(--space-2);
    border-radius: 0;
  }

  .toast-message {
    -webkit-line-clamp: 1;
  }
}
</style>
