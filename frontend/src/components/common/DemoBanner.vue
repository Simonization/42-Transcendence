<script setup lang="ts">
defineProps<{ message?: string }>()
</script>

<template>
  <div class="demo-banner">
    {{ message || 'Demo mode — backend unavailable' }}
  </div>
</template>

<style scoped>
.demo-banner {
  padding: var(--space-2) var(--space-3);
  background: var(--color-warning-bg, rgba(255, 193, 7, 0.15));
  border: 1px solid var(--color-warning, #f0ad4e);
  color: var(--color-warning, #f0ad4e);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  text-align: center;
}
</style>
