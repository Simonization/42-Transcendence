<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { getAccessToken, clearTokens } from '../api'
import { requiresTwoFactor, ApiError } from '../types'
import type { User } from '../types'

const router = useRouter()
const emit = defineEmits<{
  'auth-changed': []
}>()

const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const message = ref('')
const isLoading = ref(false)
const isAuthenticated = ref(false)
const currentUser = ref<User | null>(null)

const checkAuth = async () => {
  const token = getAccessToken()
  if (!token) return

  try {
    const user = await usersApi.getMe()
    isAuthenticated.value = true
    currentUser.value = user
    router.push('/')
  } catch {
    clearTokens()
  }
}

const logout = async () => {
  try {
    await authApi.logout()
    message.value = 'Logged out successfully'
  } catch {
    // Tokens cleared by authApi.logout() even on error
    message.value = 'Logged out'
  } finally {
    isAuthenticated.value = false
    currentUser.value = null
    emit('auth-changed')
  }
}

onMounted(() => {
  checkAuth()
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
      message.value = 'Credentials valid. Please verify your 2FA code.'
      setTimeout(() => {
        router.push(`/verify-2fa?userId=${response.userId}`)
      }, 1000)
    } else {
      message.value = `Login successful! Welcome ${response.user.username}`
      isAuthenticated.value = true
      // Fetch full user data
      currentUser.value = await usersApi.getMe()
      emit('auth-changed')
      router.push('/')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      message.value = `Error: ${error.message}`
    } else {
      message.value = 'Network error!'
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
    username.value = ''
    email.value = ''
    password.value = ''
  } catch (error) {
    if (error instanceof ApiError) {
      message.value = `Error: ${error.message}`
    } else {
      message.value = 'Network error!'
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
  <div class="login-container">
    <div class="login-card" v-if="isAuthenticated">
      <h1>Welcome back!</h1>
      <div class="user-info">
        <p><strong>Username:</strong> {{ currentUser?.username }}</p>
        <p><strong>Email:</strong> {{ currentUser?.mail }}</p>
      </div>
      <button @click="logout" class="logout-btn">Logout</button>
      <p v-if="message" class="message success">{{ message }}</p>
    </div>

    <div class="login-card" v-else>
      <h1>{{ isLogin ? 'Login' : 'Register' }}</h1>

      <form @submit.prevent="isLogin ? login() : register()">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter username"
            required
          />
        </div>

        <div v-if="!isLogin" class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="isLogin ? 'Enter password' : 'Min. 8 characters'"
            required
          />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
        </button>
      </form>

      <div class="divider">
        <span>OR</span>
      </div>

      <button @click="handleGoogleLogin" class="google-btn">
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
        Sign in with Google
      </button>

      <p class="toggle-text">
        {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
        <a @click="toggleMode">{{ isLogin ? 'Register' : 'Login' }}</a>
      </p>

      <p v-if="message" class="message" :class="{ success: !message.includes('Error'), error: message.includes('Error') }">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  text-align: center;
  color: #888;
  font-size: 0.85rem;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #eee;
}

.divider span {
  padding: 0 10px;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 0.75rem;
  background: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.google-btn:hover {
  background: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transform: none;
}

.google-btn img {
  width: 18px;
  height: 18px;
}

.toggle-text {
  text-align: center;
  margin-top: 1rem;
  color: #666;
}

.toggle-text a {
  color: #667eea;
  cursor: pointer;
  font-weight: 600;
  margin-left: 0.3rem;
  text-decoration: none;
}

.toggle-text a:hover {
  text-decoration: underline;
}

.user-info {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 5px;
  margin: 1rem 0;
  text-align: left;
}

.user-info p {
  margin: 0.5rem 0;
  color: #333;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #c82333;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 5px;
  text-align: center;
}

.message.success {
  background: #d4edda;
  color: #155724;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
