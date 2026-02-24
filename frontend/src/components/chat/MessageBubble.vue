<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '../../types'

const props = defineProps<{
  message: Message
  currentUserId: number
  isBlocked?: boolean
}>()

const emit = defineEmits<{
  delete: [messageId: number]
  viewProfile: [userId: number]
}>()

const isOwn = computed(() => props.message.senderId === props.currentUserId)
const isDeleted = computed(() => !!props.message.deletedAt)
const isEdited = computed(() => !!props.message.editedAt && !isDeleted.value)
const hasReadReceipts = computed(() => (props.message.readBy?.length ?? 0) > 0)
const isGameInvite = computed(() => props.message.content.startsWith('\u{1F3AE} Game invitation!'))

const time = computed(() => {
  const d = new Date(props.message.createdAt)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="bubble-row" :class="{ own: isOwn }">
    <div class="bubble" :class="{ own: isOwn, deleted: isDeleted, blocked: isBlocked, 'game-invite': isGameInvite }">
      <p v-if="!isOwn && message.sender" class="bubble-sender">
        <button class="sender-link" @click.stop="emit('viewProfile', message.senderId)">
          {{ message.sender.username }}
        </button>
      </p>
      <p v-if="isBlocked" class="bubble-content bubble-content-blocked">
        <em>{{ $t('chat.blockedMessage') }}</em>
      </p>
      <p v-else class="bubble-content">{{ message.content }}</p>
      <div class="bubble-meta">
        <span class="bubble-time">{{ time }}</span>
        <span v-if="isEdited" class="bubble-edited">{{ $t('chat.edited') }}</span>
        <span v-if="isOwn && hasReadReceipts" class="bubble-receipt bubble-receipt-read" :title="$t('chat.seenBy')">&#10003;&#10003;</span>
        <span v-else-if="isOwn && message.deliveredAt" class="bubble-receipt bubble-receipt-delivered" :title="$t('chat.delivered')">&#10003;</span>
      </div>
      <button
        v-if="isOwn && !isDeleted"
        class="bubble-delete"
        @click="emit('delete', message.id)"
        :title="$t('chat.deleteMessage')"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<style scoped>
.bubble-row {
  display: flex;
  margin-bottom: var(--space-2);
}

.bubble-row.own {
  justify-content: flex-end;
}

.bubble {
  position: relative;
  max-width: 75%;
  padding: var(--space-2) var(--space-3);
  -webkit-clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
}

.bubble.own {
  background: var(--accent-primary-subtle);
  border-color: transparent;
}

.bubble.deleted {
  opacity: 0.5;
  font-style: italic;
}

.bubble.blocked {
  opacity: 0.4;
}

.bubble.game-invite {
  border-color: var(--accent-primary);
  background: var(--accent-primary-subtle);
}

.bubble-sender {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--accent-primary);
  margin: 0 0 var(--space-1) 0;
}

.sender-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.sender-link:hover {
  opacity: 0.7;
  text-decoration: underline;
}

.bubble-content {
  font-size: var(--text-sm);
  color: var(--text-primary);
  margin: 0;
  word-break: break-word;
  line-height: var(--leading-relaxed);
}

.bubble-content-blocked {
  color: var(--text-tertiary);
}

.bubble-meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-1);
}

.bubble-time {
  font-size: 10px;
  color: var(--text-tertiary);
}

.bubble-edited {
  font-size: 10px;
  color: var(--text-tertiary);
  font-style: italic;
}

.bubble-receipt {
  font-size: 11px;
  line-height: 1;
}

.bubble-receipt-read {
  color: var(--color-success);
}

.bubble-receipt-delivered {
  color: var(--text-tertiary);
}

.bubble-delete {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  -webkit-clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.bubble:hover .bubble-delete {
  opacity: 1;
}

.bubble-delete:focus-visible {
  opacity: 1;
}

.bubble-delete:hover {
  color: var(--color-error);
  background: var(--color-error-bg);
}
</style>
