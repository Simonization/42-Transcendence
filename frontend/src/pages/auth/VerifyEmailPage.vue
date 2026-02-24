<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi } from '../../api/auth'
import { useErrorHandler } from '../../composables/useErrorHandler'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const isSuccess = ref(false)
const isError = ref(false)

const { t } = useI18n()
const { message: errorMessage } = useErrorHandler()

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    isLoading.value = false
    isError.value = true
    errorMessage.value = t('verifyEmail.noToken')
    return
  }

  try {
    await authApi.verifyEmail(token)
    isSuccess.value = true
  } catch (error) {
    isError.value = true
    errorMessage.value = error instanceof Error ? error.message : t('verifyEmail.networkError')
  } finally {
    isLoading.value = false
  }
})

const redirectToLogin = () => {
  router.push('/auth')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <!-- Loading -->
      <div v-if="isLoading" class="state-container">
        <div class="spinner"></div>
        <h2 class="state-title">{{ $t('verifyEmail.verifying') }}</h2>
        <p class="state-text">{{ $t('verifyEmail.pleaseWait') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="isSuccess" class="state-container">
        <div class="state-icon state-icon-success">&#x2713;</div>
        <h2 class="state-title">{{ $t('verifyEmail.verified') }}</h2>
        <p class="state-text">{{ $t('verifyEmail.verifiedMsg') }}</p>
        <button @click="redirectToLogin" class="auth-btn">{{ $t('verifyEmail.goToLogin') }}</button>
      </div>

      <!-- Error -->
      <div v-else-if="isError" class="state-container">
        <div class="state-icon state-icon-error">&#x2715;</div>
        <h2 class="state-title">{{ $t('verifyEmail.failed') }}</h2>
        <p class="state-text">{{ errorMessage }}</p>
        <button @click="redirectToLogin" class="auth-btn auth-btn-secondary">{{ $t('verifyEmail.backToLogin') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0;
}

.state-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.state-icon {
  width: 64px;
  height: 64px;
  -webkit-clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.state-icon-success {
  background: rgba(52, 211, 153, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.state-icon-error {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.auth-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--text-primary);
  border: 1px solid transparent;
  -webkit-clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.auth-btn:hover {
  background: var(--bg-secondary);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.auth-btn-secondary {
  background: transparent;
  color: var(--text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.auth-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  box-shadow: none;
}
</style>
