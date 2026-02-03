<template>
  <div class="verify-container">
    <div class="card">
      <div v-if="isLoading" class="spinner-container">
        <div class="spinner"></div>
        <p>Verifying your code...</p>
      </div>

      <div v-else-if="isSuccess" class="success-container">
        <div class="checkmark">✓</div>
        <h2>Success!</h2>
        <p>Your account has been verified. You're now logged in.</p>
        <button @click="redirectToApp" class="btn-success">Continue to App</button>
      </div>

      <div v-else-if="isError" class="error-container">
        <div class="error-icon">✕</div>
        <h2>Verification Failed</h2>
        <p>{{ errorMessage }}</p>
        <button @click="resetForm" class="btn-retry">Try Again</button>
        <button @click="goBackToLogin" class="btn-back">Back to Login</button>
      </div>

      <div v-else class="form-container">
        <h2>Two-Factor Authentication</h2>
        <p>Enter the 6-digit code sent to your email</p>

        <form @submit.prevent="handleSubmit">
          <input
            v-model="code"
            type="text"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            class="code-input"
            @input="code = code.replace(/[^0-9]/g, '')"
            autofocus
          />

          <button type="submit" class="btn-verify" :disabled="code.length !== 6">
            Verify Code
          </button>
        </form>

        <p class="resend-info">
          Didn't receive a code? Check your spam folder or wait a moment.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/auth'
import { ApiError } from '../types'

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
  if (code.value.length !== 6 || userId.value === null) {
    errorMessage.value = 'Please enter a 6-digit code'
    return
  }

  isLoading.value = true
  isError.value = false

  try {
    await authApi.verify2FA({
      userId: userId.value,
      code: code.value,
    })
    isSuccess.value = true
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

const redirectToApp = () => {
  router.push('/')
}

const goBackToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.verify-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.form-container h2 {
  color: #333;
  margin-bottom: 10px;
  font-size: 24px;
}

.form-container p {
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.code-input {
  width: 100%;
  padding: 15px;
  font-size: 32px;
  text-align: center;
  letter-spacing: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  transition: border-color 0.3s;
}

.code-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-verify {
  width: 100%;
  padding: 12px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-verify:hover:not(:disabled) {
  background-color: #764ba2;
}

.btn-verify:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.resend-info {
  color: #999;
  font-size: 12px;
  margin-top: 15px;
}

/* Spinner */
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 0;
}

.spinner {
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinner-container p {
  color: #333;
  margin: 0;
}

/* Success */
.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.checkmark {
  width: 60px;
  height: 60px;
  background-color: #4caf50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: bold;
}

.success-container h2 {
  color: #4caf50;
  margin: 0;
}

.success-container p {
  color: #666;
  margin: 0;
}

.btn-success {
  background-color: #4caf50;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 10px;
}

.btn-success:hover {
  background-color: #45a049;
}

/* Error */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.error-icon {
  width: 60px;
  height: 60px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: bold;
}

.error-container h2 {
  color: #f44336;
  margin: 0;
}

.error-container p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.btn-retry,
.btn-back {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 10px;
  width: 100%;
}

.btn-retry {
  background-color: #667eea;
  color: white;
}

.btn-retry:hover {
  background-color: #764ba2;
}

.btn-back {
  background-color: #e9ecef;
  color: #333;
}

.btn-back:hover {
  background-color: #dee2e6;
}
</style>
