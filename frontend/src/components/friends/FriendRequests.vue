<script setup lang="ts">
import type { Friend } from '../../types'

defineProps<{
  requests: Friend[]
}>()

const emit = defineEmits<{
  accept: [friendId: number]
  decline: [friendId: number]
}>()
</script>

<template>
  <div class="request-list">
    <div v-if="requests.length === 0" class="empty-state">
      <p class="text-tertiary">No pending requests</p>
    </div>

    <div v-for="request in requests" :key="request.id" class="request-item">
      <div class="request-avatar">
        <span class="request-avatar-initials">
          {{ request.username.slice(0, 2).toUpperCase() }}
        </span>
      </div>

      <div class="request-info">
        <p class="request-name">{{ request.username }}</p>
      </div>

      <div class="request-actions">
        <button class="btn btn-primary btn-sm" @click="emit('accept', request.id)">
          ACCEPT
        </button>
        <button class="btn btn-ghost btn-sm" @click="emit('decline', request.id)">
          DECLINE
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-list {
  display: flex;
  flex-direction: column;
}

.empty-state {
  padding: var(--space-6);
  text-align: center;
}

.request-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.request-item:last-child {
  border-bottom: none;
}

.request-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.request-avatar-initials {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

.request-info {
  flex: 1;
}

.request-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin: 0;
}

.request-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
</style>
