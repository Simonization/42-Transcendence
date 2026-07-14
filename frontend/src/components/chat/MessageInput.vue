<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  typing: [isTyping: boolean] 
}>()

const content = ref('')
let typingTimeout: ReturnType<typeof setTimeout> | null = null

const stopTyping = () => {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
    typingTimeout = null
  }
  emit('typing', false)
}

const handleSubmit = () => {
  if (!content.value.trim()) return
  emit('send', content.value)
  content.value = ''
  stopTyping()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

const handleInput = () => {
  if (!typingTimeout) {
    emit('typing', true)
  } else {
    clearTimeout(typingTimeout)
  }
  
  typingTimeout = setTimeout(() => {
    stopTyping()
  }, 1500)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="message-input">
    <input
      v-model="content"
      type="text"
      class="input message-field"
      :placeholder="$t('chat.typeMessage')"
      :disabled="disabled"
      :aria-label="$t('chat.typeMessage')"
      @keydown="handleKeydown"
      @input="handleInput"
      autocomplete="off"
    />
    <button
      type="submit"
      class="btn btn-primary btn-sm send-btn"
      :disabled="disabled || !content.trim()"
    >
      {{ $t('common.send') }}
    </button>
  </form>
</template>

<style scoped>
.message-input {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.message-field {
  flex: 1;
  min-width: 0;
}

.send-btn {
  flex-shrink: 0;
}
</style>
