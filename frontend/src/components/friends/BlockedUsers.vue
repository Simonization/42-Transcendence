<script setup lang="ts">
import type { Block } from '../../types'

defineProps<{
  blocks: Block[]
  isUpdating: boolean
}>()

const emit = defineEmits<{
  unblock: [targetId: number]
}>()
</script>

<template>
  <div class="block-list">
    <div v-if="blocks.length === 0" class="empty-state">
      <p class="text-tertiary">{{ $t('friends.noBlocked') }}</p>
    </div>

    <div v-for="block in blocks" :key="block.id" class="block-item">
      <div class="block-info">
        <p class="block-name">{{ block.blocked.username }}</p>
        <p v-if="block.reason" class="block-reason">{{ block.reason }}</p>
      </div>

      <button
        class="btn btn-ghost btn-sm"
        :disabled="isUpdating"
        @click="emit('unblock', block.blocked.id)"
      >
        {{ isUpdating ? $t('friends.updating') : $t('friends.unblock') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.block-list {
  display: flex;
  flex-direction: column;
}

.empty-state {
  padding: var(--space-6);
  text-align: center;
}

.block-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.block-item:last-child {
  border-bottom: none;
}

.block-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin: 0;
}

.block-reason {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: var(--space-1) 0 0 0;
}
</style>
