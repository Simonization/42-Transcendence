<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../../api/auth'
import { ApiError } from '../../types'

const route = useRoute()
const router = useRouter()

const code = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const userId = ref<number | null>(null)

onMounted(() => {
  const queryUserId = route.query.userId as string | undefined
  if (!queryUserId) {
    isError.value = true
    errorMessage.value = 'Invalid session. Please login again.'
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
    setTimeout(() => router.push('/menu'), 800)
  } catch (error) {
    isError.value = true
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'An error occurred. Please try again.'
    }
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
        <h2 class="state-title">VERIFYING CODE</h2>
      </div>

      <!-- Success -->
      <div v-else-if="isSuccess" class="state-container">
        <div class="state-icon state-icon-success">&#x2713;</div>
        <h2 class="state-title">VERIFIED</h2>
        <p class="state-text">Redirecting...</p>
      </div>

      <!-- Error -->
      <div v-else-if="isError && !userId" class="state-container">
        <div class="state-icon state-icon-error">&#x2715;</div>
        <h2 class="state-title">INVALID SESSION</h2>
        <p class="state-text">{{ errorMessage }}</p>
        <button @click="goBackToLogin" class="auth-btn auth-btn-secondary">BACK TO LOGIN</button>
      </div>

      <!-- Form -->
      <div v-else class="state-container">
        <h2 class="state-title">TWO-FACTOR AUTH</h2>
        <p class="state-text">Enter the 6-digit code sent to your email</p>

        <form @submit.prevent="handleSubmit" class="tfa-form">
          <input
            v-model="code"
            type="text"
            class="code-input"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            @input="code = code.replace(/[^0-9]/g, '')"
            autofocus
          />

          <button type="submit" class="auth-btn" :disabled="code.length !== 6">
            VERIFY CODE
          </button>
        </form>

        <Transition name="msg">
          <p v-if="isError" class="auth-message auth-message-error">
            {{ errorMessage }}
            <a @click="resetForm" class="retry-link">Try again</a>
          </p>
        </Transition>

        <p class="state-text" style="margin-top: var(--space-4);">
          Didn't receive a code? Check your spam folder.
        </p>

        <button @click="goBackToLogin" class="back-link">BACK TO LOGIN</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0e1a;
  padding: var(--space-4);
}

.auth-panel {
  width: 100%;
  max-width: 420px;
  padding: var(--space-12) var(--space-8);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  box-shadow: 0 0 40px rgba(100, 120, 200, 0.06);
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: #e8e6e3;
  margin: 0;
}

.state-text {
  font-size: var(--text-sm);
  color: #6b7280;
  margin: 0;
}

.state-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.state-icon-success {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.state-icon-error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  color: #e8e6e3;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
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
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: #0a0e1a;
  background: #e8e6e3;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.auth-btn:hover:not(:disabled) {
  background: #ffffff;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.auth-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.auth-btn-secondary {
  background: transparent;
  color: #9ca3af;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.auth-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #e8e6e3;
  box-shadow: none;
}

.auth-message {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.auth-message-error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.retry-link {
  display: inline;
  margin-left: var(--space-2);
  color: #e8e6e3;
  cursor: pointer;
  text-decoration: underline;
}

.back-link {
  margin-top: var(--space-2);
  background: none;
  border: none;
  color: #6b7280;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-default);
}

.back-link:hover {
  color: #e8e6e3;
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
