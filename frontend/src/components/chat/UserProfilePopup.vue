<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  userId: number
  username: string
}>()

const emit = defineEmits<{
  close: []
  sendMessage: []
  viewFriends: []
}>()

const { t } = useI18n()

const initials = props.username.slice(0, 2).toUpperCase()
</script>

<template>
  <Teleport to="body">
    <div class="popup-backdrop" @click.self="emit('close')">
      <div class="popup-panel" role="dialog" aria-modal="true">
        <div class="popup-header">
          <div class="popup-avatar">{{ initials }}</div>
          <div class="popup-info">
            <h3 class="popup-username">{{ username }}</h3>
            <span class="popup-id">ID: {{ userId }}</span>
          </div>
          <button class="popup-close" @click="emit('close')" :title="$t('common.close')">&times;</button>
        </div>
        <div class="popup-actions">
          <button class="btn btn-secondary btn-sm" @click="emit('sendMessage')">
            {{ t('chat.sendMessage') }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="emit('viewFriends')">
            {{ t('chat.viewInFriends') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.popup-panel {
  width: 100%;
  max-width: 320px;
  padding: var(--space-5);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  -webkit-clip-path: polygon(
    0 0,
    calc(100% - var(--chamfer-md)) 0,
    100% var(--chamfer-md),
    100% 100%,
    var(--chamfer-xs) 100%,
    0 calc(100% - var(--chamfer-xs))
  );
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

.popup-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.popup-avatar {
  width: 48px;
  height: 48px;
  -webkit-clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.popup-info {
  flex: 1;
  min-width: 0;
}

.popup-username {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.popup-id {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.popup-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: var(--text-lg);
  cursor: pointer;
  padding: var(--space-1);
  line-height: 1;
  transition: color var(--duration-fast) var(--ease-default);
  align-self: flex-start;
}

.popup-close:hover {
  color: var(--text-primary);
}

.popup-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
