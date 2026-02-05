<script setup lang="ts">
import type { Friend } from '../../types'

defineProps<{
  friends: Friend[]
}>()

const emit = defineEmits<{
  remove: [friendId: number]
  block: [friendId: number]
}>()
</script>

<template>
  <div class="friend-list">
    <div v-if="friends.length === 0" class="empty-state">
      <p class="text-tertiary">No friends yet</p>
    </div>

    <div v-for="friend in friends" :key="friend.id" class="friend-item">
      <div class="friend-avatar">
        <img
          v-if="friend.profile?.avatarUrl"
          :src="friend.profile.avatarUrl"
          :alt="friend.username"
          class="friend-avatar-img"
        />
        <span v-else class="friend-avatar-initials">
          {{ friend.username.slice(0, 2).toUpperCase() }}
        </span>
      </div>

      <div class="friend-info">
        <p class="friend-name">{{ friend.profile?.displayName || friend.username }}</p>
        <p class="friend-username">@{{ friend.username }}</p>
      </div>

      <div class="friend-actions">
        <button class="btn btn-ghost btn-sm" @click="emit('remove', friend.id)" title="Remove">
          REMOVE
        </button>
        <button class="btn btn-ghost btn-sm text-error" @click="emit('block', friend.id)" title="Block">
          BLOCK
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.friend-list {
  display: flex;
  flex-direction: column;
}

.empty-state {
  padding: var(--space-6);
  text-align: center;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.friend-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-avatar-initials {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin: 0;
}

.friend-username {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
}

.friend-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.text-error {
  color: var(--color-error) !important;
}
</style>
