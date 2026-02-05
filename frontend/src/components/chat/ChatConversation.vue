<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message } from '../../types'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: Message[]
  currentUserId: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  deleteMessage: [messageId: number]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

// Auto-scroll when new messages arrive
watch(() => props.messages.length, async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
})
</script>

<template>
  <div ref="scrollContainer" class="conversation">
    <div v-if="isLoading" class="loading-text">Loading messages...</div>

    <div v-else-if="messages.length === 0" class="empty-state">
      <p class="text-tertiary">No messages yet. Say hello!</p>
    </div>

    <template v-else>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :current-user-id="currentUserId"
        @delete="emit('deleteMessage', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.conversation {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.loading-text,
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
</style>
