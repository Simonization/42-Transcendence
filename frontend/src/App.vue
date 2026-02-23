<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useChat } from '@/composables/useChat'
import NotificationContainer from './components/notifications/NotificationContainer.vue'

const router = useRouter()
const authStore = useAuthStore()
const isAuthLoading = ref(false)
const { connectSocket } = useChat()

// Monitor router navigation to show loading during auth check
watch(() => router.currentRoute.value, () => {
  // Reset loading state when route changes
  isAuthLoading.value = false
})

// Show loading during auth store operations
watch(() => authStore.isLoading, (loading) => {
  isAuthLoading.value = loading
})

onMounted(() => {
  console.log("App mounted, connecting socket...")
  connectSocket()
})

</script>

<template>
  <!-- Loading overlay during auth validation -->
  <Transition name="fade">
    <div v-if="isAuthLoading" class="auth-loading">
      <div class="loading-spinner"></div>
      <p>{{ $t('auth.validatingCredentials') }}</p>
    </div>
  </Transition>

  <RouterView />
  <NotificationContainer />
</template>

<style scoped>
.auth-loading {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  z-index: 9999;
  gap: var(--space-4);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 2px solid var(--accent-primary);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-loading p {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wider);
  margin: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
