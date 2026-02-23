<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const cancelButtonRef = ref<HTMLButtonElement | null>(null)

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('cancel')
  }
}

const handleTabTrap = (e: KeyboardEvent) => {
  if (e.key !== 'Tab' || !dialogRef.value) return

  const focusableElements = dialogRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault()
    lastElement?.focus()
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault()
    firstElement?.focus()
  }
}

onMounted(() => {
  cancelButtonRef.value?.focus()
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('keydown', handleTabTrap)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('keydown', handleTabTrap)
})
</script>

<template>
  <Teleport to="body">
    <div class="dialog-backdrop" @click.self="emit('cancel')">
      <div
        ref="dialogRef"
        class="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h3 id="confirm-dialog-title" class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button ref="cancelButtonRef" class="btn btn-secondary" @click="emit('cancel')">
            {{ cancelLabel || $t('confirm.defaultCancel') }}
          </button>
          <button
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="emit('confirm')"
          >
            {{ confirmLabel || $t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.dialog-panel {
  width: 100%;
  max-width: 400px;
  padding: var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  clip-path: polygon(
    0 0,
    calc(100% - var(--chamfer-md)) 0,
    100% var(--chamfer-md),
    100% 100%,
    var(--chamfer-xs) 100%,
    0 calc(100% - var(--chamfer-xs))
  );
  box-shadow: var(--shadow-xl);
}

.dialog-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
}

.dialog-message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-6) 0;
  line-height: var(--leading-relaxed);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
