<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi } from '../../api/auth'
import { useErrorHandler } from '../../composables/useErrorHandler'

const REDIRECT_DELAY = 800

const route = useRoute()
const router = useRouter()

const code = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)
const isError = ref(false)
const userId = ref<number | null>(null)

const { t } = useI18n()
const { message: errorMessage } = useErrorHandler()

onMounted(() => {
  const queryUserId = route.query.userId as string | undefined
  if (!queryUserId) {
    isError.value = true
    errorMessage.value = t('twoFactor.invalidSessionMsg')
  } else {
    userId.value = parseInt(queryUserId, 10)
  }
})

const handleSubmit = async () => {
  if (code.value.length !== 6 || userId.value === null) return

  isLoading.value = true
  isError.value = false

  try {
    await authApi.verify2FA({
      userId: userId.value,
      code: code.value,
    })
    isSuccess.value = true
    setTimeout(() => router.push('/menu'), REDIRECT_DELAY)
  } catch (error) {
    isError.value = true
    errorMessage.value = error instanceof Error ? error.message : t('twoFactor.tryAgain')
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  isError.value = false
  errorMessage.value = ''
  code.value = ''
}

const goBackToLogin = () => {
  router.push('/auth')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <!-- Loading -->
      <div v-if="isLoading" class="state-container">
        <div class="spinner"></div>
        <h2 class="state-title">{{ $t('twoFactor.verifyingCode') }}</h2>
      </div>

      <!-- Success -->
      <div v-else-if="isSuccess" class="state-container">
        <div class="state-icon state-icon-success">&#x2713;</div>
        <h2 class="state-title">{{ $t('twoFactor.verified') }}</h2>
        <p class="state-text">{{ $t('twoFactor.redirecting') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="isError && !userId" class="state-container">
        <div class="state-icon state-icon-error">&#x2715;</div>
        <h2 class="state-title">{{ $t('twoFactor.invalidSession') }}</h2>
        <p class="state-text">{{ errorMessage }}</p>
        <button @click="goBackToLogin" class="auth-btn auth-btn-secondary">{{ $t('twoFactor.backToLogin') }}</button>
      </div>

      <!-- Form -->
      <div v-else class="state-container">
        <h2 class="state-title">{{ $t('twoFactor.title') }}</h2>
        <p class="state-text">{{ $t('twoFactor.enterCode') }}</p>

        <form @submit.prevent="handleSubmit" class="tfa-form">
          <input
            v-model="code"
            type="text"
            class="code-input"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            aria-label="Two-factor authentication code"
            @input="code = code.replace(/[^0-9]/g, '')"
            autofocus
          />

          <button type="submit" class="auth-btn" :disabled="code.length !== 6">
            {{ $t('twoFactor.verifyCode') }}
          </button>
        </form>

        <Transition name="msg">
          <p v-if="isError" class="auth-message auth-message-error">
            {{ errorMessage }}
            <a @click="resetForm" class="retry-link">{{ $t('twoFactor.tryAgain') }}</a>
          </p>
        </Transition>

        <p class="state-text" style="margin-top: var(--space-4);">
          {{ $t('twoFactor.didntReceive') }}
        </p>

        <button @click="goBackToLogin" class="back-link">{{ $t('twoFactor.backToLogin') }}</button>
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

.tfa-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.code-input {
  width: 100%;
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  text-align: center;
  letter-spacing: 0.5em;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% 100%, 0 100%, 0 var(--chamfer-xs));
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}

.code-input:focus {
  border-color: rgba(100, 120, 200, 0.5);
  box-shadow: 0 0 12px rgba(100, 120, 200, 0.1);
}

.auth-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--text-primary);
  border: 1px solid transparent;
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.auth-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.auth-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

.auth-message {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  font-size: var(--text-sm);
}

.auth-message-error {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.retry-link {
  display: inline;
  margin-left: var(--space-2);
  color: var(--text-primary);
  cursor: pointer;
  text-decoration: underline;
}

.back-link {
  margin-top: var(--space-2);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-default);
}

.back-link:hover {
  color: var(--text-primary);
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
