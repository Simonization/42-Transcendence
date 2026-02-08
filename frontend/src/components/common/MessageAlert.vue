<script setup lang="ts">
defineProps<{
  message: string
  type: 'success' | 'error'
  show: boolean
}>()
</script>

<template>
  <Transition name="msg">
    <p
      v-if="show"
      class="section-message"
      :class="{ 'alert-error': type === 'error', 'alert-success': type === 'success' }"
    >
      {{ message }}
    </p>
  </Transition>
</template>

<style scoped>
.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from, .msg-leave-to { opacity: 0; }

.section-message {
  padding: var(--space-3);
  border-radius: 4px;
  font-size: var(--text-sm);
}

.alert-success {
  background: var(--color-success-bg);
  border-left: 2px solid var(--color-success);
  color: var(--color-success);
}

.alert-error {
  background: var(--color-error-bg);
  border-left: 2px solid var(--color-error);
  color: var(--color-error);
}
</style>
