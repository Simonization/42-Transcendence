<script setup lang="ts">
import { backendDown } from '../../api'

const retry = () => {
  backendDown.value = false
  window.location.reload()
}
</script>

<template>
  <Transition name="slide-down">
    <div v-if="backendDown" class="error-boundary">
      <div class="error-boundary-content glass-panel">
        <span class="error-icon">!</span>
        <p class="error-msg">{{ $t('errors.backendDown') }}</p>
        <button class="error-retry-btn" @click="retry">
          {{ $t('errors.retry') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding: var(--space-4);
}

.error-boundary-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-6);
  background: var(--glass-bg);
  border: 1px solid var(--color-error, #e74c3c);
  backdrop-filter: var(--backdrop-blur-medium);
  clip-path: var(--clip-card);
  max-width: 600px;
  width: 100%;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-error, #e74c3c);
  color: var(--bg-primary);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  flex-shrink: 0;
}

.error-msg {
  flex: 1;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.error-retry-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--color-error, #e74c3c);
  color: var(--bg-primary);
  border: none;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  cursor: pointer;
  clip-path: var(--clip-btn);
  transition: opacity var(--duration-fast) var(--ease-default);
}

.error-retry-btn:hover {
  opacity: 0.85;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform var(--duration-normal) var(--ease-default),
              opacity var(--duration-normal) var(--ease-default);
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
