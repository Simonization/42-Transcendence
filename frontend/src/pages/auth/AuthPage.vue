<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../../api/auth'
import { usersApi } from '../../api/users'
import { getAccessToken, clearTokens } from '../../api'
import { requiresTwoFactor, ApiError } from '../../types'
import type { User } from '../../types'

const router = useRouter()

const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const isLoading = ref(false)

onMounted(async () => {
  const token = getAccessToken()
  if (!token) return
  try {
    await usersApi.getMe()
    router.push('/menu')
  } catch {
    clearTokens()
  }
})

const login = async () => {
  isLoading.value = true
  message.value = ''

  try {
    const response = await authApi.login({
      username: username.value,
      password: password.value,
    })

    if (requiresTwoFactor(response)) {
      message.value = 'Credentials valid. Redirecting to 2FA...'
      messageType.value = 'success'
      setTimeout(() => {
        router.push(`/auth/2fa?userId=${response.userId}`)
      }, 800)
    } else {
      message.value = `Welcome, ${response.user.username}`
      messageType.value = 'success'
      router.push('/menu')
    }
  } catch (error) {
    messageType.value = 'error'
    if (error instanceof ApiError) {
      message.value = error.message
    } else {
      message.value = 'Network error'
    }
  } finally {
    isLoading.value = false
  }
}

const register = async () => {
  isLoading.value = true
  message.value = ''

  try {
    await authApi.register({
      username: username.value,
      mail: email.value,
      password: password.value,
    })
    message.value = 'Registration successful! Check your email to verify.'
    messageType.value = 'success'
    username.value = ''
    email.value = ''
    password.value = ''
  } catch (error) {
    messageType.value = 'error'
    if (error instanceof ApiError) {
      message.value = error.message
    } else {
      message.value = 'Network error'
    }
  } finally {
    isLoading.value = false
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  message.value = ''
  username.value = ''
  email.value = ''
  password.value = ''
}

const handleGoogleLogin = () => {
  authApi.googleLogin()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="auth-header">
        <h1 class="auth-title">ESPORTENDENCE</h1>
        <p class="auth-subtitle">{{ isLogin ? 'SIGN IN' : 'CREATE ACCOUNT' }}</p>
      </div>

      <form @submit.prevent="isLogin ? login() : register()" class="auth-form">
        <div class="field">
          <label class="field-label" for="username">USERNAME</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="field-input"
            placeholder="Enter username"
            required
            autocomplete="username"
          />
        </div>

        <div v-if="!isLogin" class="field">
          <label class="field-label" for="email">EMAIL</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            placeholder="Enter email"
            required
            autocomplete="email"
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">PASSWORD</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="field-input"
            :placeholder="isLogin ? 'Enter password' : 'Min. 8 characters'"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="auth-btn" :disabled="isLoading">
          {{ isLoading ? 'LOADING...' : (isLogin ? 'LOGIN' : 'REGISTER') }}
        </button>
      </form>

      <div class="auth-divider">
        <span class="auth-divider-text">OR</span>
      </div>

      <button @click="handleGoogleLogin" class="auth-btn auth-btn-google">
        SIGN IN WITH GOOGLE
      </button>

      <p class="auth-toggle">
        {{ isLogin ? "No account?" : 'Already registered?' }}
        <a @click="toggleMode" class="auth-toggle-link">
          {{ isLogin ? 'REGISTER' : 'LOGIN' }}
        </a>
      </p>

      <Transition name="msg">
        <p
          v-if="message"
          class="auth-message"
          :class="messageType === 'error' ? 'auth-message-error' : 'auth-message-success'"
        >
          {{ message }}
        </p>
      </Transition>
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
  padding: var(--space-10) var(--space-8);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  box-shadow: 0 0 40px rgba(100, 120, 200, 0.06);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: #e8e6e3;
  margin: 0 0 var(--space-2) 0;
}

.auth-subtitle {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-widest);
  color: #6b7280;
  text-transform: uppercase;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-widest);
  color: #9ca3af;
  text-transform: uppercase;
}

.field-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: #e8e6e3;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}

.field-input::placeholder {
  color: #4b5563;
}

.field-input:focus {
  border-color: rgba(100, 120, 200, 0.5);
  box-shadow: 0 0 12px rgba(100, 120, 200, 0.1);
}

.auth-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-2);
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
  opacity: 0.4;
  cursor: not-allowed;
}

.auth-btn-google {
  background: transparent;
  color: #9ca3af;
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-top: 0;
}

.auth-btn-google:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.04);
  color: #e8e6e3;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: var(--space-6) 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.auth-divider-text {
  padding: 0 var(--space-4);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: #4b5563;
}

.auth-toggle {
  text-align: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: #6b7280;
}

.auth-toggle-link {
  color: #e8e6e3;
  cursor: pointer;
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  margin-left: var(--space-1);
  text-decoration: none;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.auth-toggle-link:hover {
  opacity: 0.7;
}

.auth-message {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  text-align: center;
}

.auth-message-success {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.2);
}

.auth-message-error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.2);
}

/* Message transition */
.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
