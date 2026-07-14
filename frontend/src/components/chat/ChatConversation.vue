<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Message } from '../../types'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: Message[]
  currentUserId: number
  isLoading: boolean
  typingUsers?: string[]
  blockedUserIds?: number[]
}>()

const emit = defineEmits<{
  deleteMessage: [messageId: number]
  viewProfile: [userId: number]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const hasTyping = computed(() => (props.typingUsers?.length ?? 0) > 0)

const scrollToBottom = async () => {
  await nextTick()
  setTimeout(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  }, 50)
}

watch(
  () => props.messages, 
  scrollToBottom, 
  { deep: true, immediate: true }
)

watch(
  () => props.isLoading,
  (isLoadingNow) => {
    if (!isLoadingNow) {
      scrollToBottom()
    }
  }
)

watch(
  () => hasTyping.value,
  scrollToBottom
)

</script>

<template>
  <div ref="scrollContainer" class="conversation">
    <div v-if="isLoading" class="loading-text">{{ $t('chat.loadingMessages') }}</div>

    <div v-else-if="messages.length === 0" class="empty-state">
      <p class="text-tertiary">{{ $t('chat.noMessages') }} {{ $t('chat.noMessagesHint') }}</p>
    </div>

    <template v-else>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :current-user-id="currentUserId"
        :is-blocked="blockedUserIds?.includes(msg.senderId)"
        @delete="emit('deleteMessage', $event)"
        @view-profile="emit('viewProfile', $event)"
      />
    </template>

    <div v-if="hasTyping" class="typing-indicator">
      <span class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
      <span class="typing-text">
        <template v-if="typingUsers!.length === 1">
          {{ $t('chat.userIsTyping', { name: typingUsers![0] }) }}
        </template>
        <template v-else>
          {{ $t('chat.multipleTyping') }}
        </template>
      </span>
    </div>
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

.typing-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.typing-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-primary);
  -webkit-clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation: typing-bounce 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

.typing-text {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-style: italic;
}
</style>
