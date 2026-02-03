<template>
  <div class="verify-container">
    <div class="verify-card">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <h2>Verifying your email...</h2>
        <p>Please wait while we confirm your email address.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="isSuccess" class="success-state">
        <div class="success-icon">✓</div>
        <h2>Email Verified!</h2>
        <p>Your email address has been successfully verified.</p>
        <p class="subtext">You can now log in with your account.</p>
        <button @click="redirectToLogin" class="btn-primary">Go to Login</button>
      </div>

      <!-- Error State -->
      <div v-else-if="isError" class="error-state">
        <div class="error-icon">✕</div>
        <h2>Verification Failed</h2>
        <p>{{ errorMessage }}</p>
        <button @click="redirectToLogin" class="btn-secondary">Back to Login</button>
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
  router.push('/login')
}
</script>

<style scoped>
.verify-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.verify-card {
  background: white;
  border-radius: 12px;
  padding: 60px 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 100%;
  text-align: center;
}

.loading-state,
.success-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-state h2 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.loading-state p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.success-icon,
.error-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
}

.success-icon {
  background-color: #d4edda;
  color: #28a745;
}

.error-icon {
  background-color: #f8d7da;
  color: #dc3545;
}

.success-state h2,
.error-state h2 {
  color: #333;
  margin: 0;
  font-size: 28px;
}

.success-state p,
.error-state p {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.subtext {
  font-size: 14px !important;
  color: #999 !important;
}

.btn-primary,
.btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.btn-primary {
  background-color: #28a745;
  color: white;
}

.btn-primary:hover {
  background-color: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-secondary {
  background-color: #e9ecef;
  color: #333;
}

.btn-secondary:hover {
  background-color: #dee2e6;
  transform: translateY(-2px);
}
</style>
