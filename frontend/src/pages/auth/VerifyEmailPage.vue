<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../../api/auth'
import { ApiError } from '../../types'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const isSuccess = ref(false)
const isError = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    isLoading.value = false
    isError.value = true
    errorMessage.value = 'No verification token provided.'
    return
  }

  try {
    await authApi.verifyEmail(token)
    isSuccess.value = true
  } catch (error) {
    isError.value = true
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Network error. Please try again later.'
    }
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
        <h2 class="state-title">VERIFYING EMAIL</h2>
        <p class="state-text">Please wait...</p>
      </div>

      <!-- Success -->
      <div v-else-if="isSuccess" class="state-container">
        <div class="state-icon state-icon-success">&#x2713;</div>
        <h2 class="state-title">EMAIL VERIFIED</h2>
        <p class="state-text">Your email has been confirmed.</p>
        <button @click="redirectToLogin" class="auth-btn">GO TO LOGIN</button>
      </div>

      <!-- Error -->
      <div v-else-if="isError" class="state-container">
        <div class="state-icon state-icon-error">&#x2715;</div>
        <h2 class="state-title">VERIFICATION FAILED</h2>
        <p class="state-text">{{ errorMessage }}</p>
        <button @click="redirectToLogin" class="auth-btn auth-btn-secondary">BACK TO LOGIN</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
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

.auth-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: #0a0e1a;
  background: #e8e6e3;
  border: 1px solid transparent;
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.auth-btn:hover {
  background: #ffffff;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
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
</style>
