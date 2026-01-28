<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useRoute } from 'vue-router'
import LoginPage from './components/LoginPage.vue'

const route = useRoute()

const message = ref('')
const isLoading = ref(false)
const chatMessages = ref<string[]>([])
const isAuthenticated = ref(false)

const timer = ref('0.0')
let timerInterval: any = null
let startTime: number = 0

// 2FA states
const twoFactorEnabled = ref(false)
const twoFactorCode = ref('')
const twoFactorLoading = ref(false)
const twoFactorMessage = ref('')
const showTwoFactorForm = ref(false)
const isFetching2FAStatus = ref(true)

const checkAuth = async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    isAuthenticated.value = false
    isFetching2FAStatus.value = false
    return
  }
  
  try {
    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (response.ok) {
      isAuthenticated.value = true
      await fetchTwoFactorStatus()
    } else {
      isAuthenticated.value = false
      isFetching2FAStatus.value = false
    }
  } catch (error) {
    isAuthenticated.value = false
    isFetching2FAStatus.value = false
  }
}

const fetchData = async () => {
  isLoading.value = true
  message.value = ''
  
  try {
    const response = await fetch('/api/')
    const text = await response.text()
    message.value = text
  } catch (error) {
    message.value = 'Error: Network Problem with Backend!'
  } finally {
    isLoading.value = false
  }
}

const logout = async () => {
  const token = localStorage.getItem('accessToken')
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    isAuthenticated.value = false
    twoFactorEnabled.value = false
    twoFactorCode.value = ''
    twoFactorMessage.value = ''
    showTwoFactorForm.value = false
    isFetching2FAStatus.value = false
  }
}

const fetchTwoFactorStatus = async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    isFetching2FAStatus.value = false
    return
  }

  isFetching2FAStatus.value = true
  try {
    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      twoFactorEnabled.value = data.twoFactorEnabled || false
    }
  } catch (error) {
    console.error('Failed to fetch 2FA status:', error)
  } finally {
    isFetching2FAStatus.value = false
  }
}

const enable2FA = async () => {
  const token = localStorage.getItem('accessToken')
  twoFactorLoading.value = true
  twoFactorMessage.value = ''

  try {
    const response = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      twoFactorMessage.value = '✓ Code sent to your email. Enter it below to confirm.'
      showTwoFactorForm.value = true
    } else {
      twoFactorMessage.value = `✗ Error: ${data.message}`
    }
  } catch (error) {
    twoFactorMessage.value = '✗ Network error!'
  } finally {
    twoFactorLoading.value = false
  }
}

const confirm2FA = async () => {
  if (twoFactorCode.value.length !== 6) {
    twoFactorMessage.value = '✗ Please enter a 6-digit code'
    return
  }

  const token = localStorage.getItem('accessToken')
  twoFactorLoading.value = true

  try {
    const response = await fetch('/api/auth/2fa/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: twoFactorCode.value })
    })

    const data = await response.json()

    if (response.ok) {
      twoFactorMessage.value = '✓ 2FA enabled successfully!'
      twoFactorEnabled.value = true
      twoFactorCode.value = ''
      showTwoFactorForm.value = false
    } else {
      twoFactorMessage.value = `✗ Error: ${data.message}`
    }
  } catch (error) {
    twoFactorMessage.value = '✗ Network error!'
  } finally {
    twoFactorLoading.value = false
  }
}

const disable2FA = async () => {
  const token = localStorage.getItem('accessToken')
  twoFactorLoading.value = true
  twoFactorMessage.value = ''

  try {
    const response = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      twoFactorMessage.value = '✓ 2FA disabled successfully'
      twoFactorEnabled.value = false
      twoFactorCode.value = ''
      showTwoFactorForm.value = false
    } else {
      twoFactorMessage.value = `✗ Error: ${data.message}`
    }
  } catch (error) {
    twoFactorMessage.value = '✗ Network error!'
  } finally {
    twoFactorLoading.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (!isAuthenticated.value) return

  const socket = io('/', {
    path: '/socket.io/',
  });

  socket.on('connect', () => {
    console.log('Connected Chat Server! ID:', socket.id);
  });

  socket.on('message', (msg: string) => {
    chatMessages.value.push(msg);
  });

  startTime = Date.now()
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    timer.value = elapsed.toFixed(1)
  }, 100)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <router-view v-if="route.name === 'verify-email' || route.name === 'verify-2fa'" />
  <LoginPage v-else-if="!isAuthenticated" @auth-changed="checkAuth" />
  <div v-else class="wrapper">
    <!-- Test Backend Section -->
    <div class="card">
      <h1 class="title">Transcendence</h1>
      <p class="description">Test for Backend-Frontend connection</p>

      <button @click="fetchData" class="connect-btn" :disabled="isLoading">
        {{ isLoading ? 'Connecting...' : "Connect to Backend" }}
      </button>

      <div v-if="message" class="message-box">
        <span class="status-dot"></span>
        {{ message }}
      </div>

      <p class="timer">{{ timer }}s</p>
    </div>

    <!-- Chat Section -->
    <div class="card">
      <h1 class="title">Transcendence Chat</h1>
      <p class="description">Real-time Chat</p>

      <div class="chat-container">
        <div class="messages">
          <div v-for="(msg, idx) in chatMessages" :key="idx" class="message">
            {{ msg }}
          </div>
          <div v-if="chatMessages.length === 0" class="message empty">
            No messages yet...
          </div>
        </div>
      </div>
    </div>

    <!-- Two-Factor Authentication Section -->
    <div class="card">
      <h1 class="title">2FA Security</h1>
      <p class="description">Two-Factor Authentication</p>

      <div v-if="isFetching2FAStatus" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading 2FA status...</p>
      </div>

      <div v-else>
        <div class="status-box" :class="{ enabled: twoFactorEnabled }">
          <span class="status-indicator"></span>
          <div>
            <p class="status-title">2FA Status</p>
            <p class="status-value">{{ twoFactorEnabled ? 'ENABLED' : 'DISABLED' }}</p>
          </div>
        </div>

        <div v-if="!twoFactorEnabled" class="actions">
          <button @click="enable2FA" class="enable-btn" :disabled="twoFactorLoading">
            {{ twoFactorLoading ? 'Sending...' : 'Enable 2FA' }}
          </button>
        </div>

        <div v-else class="actions">
          <button @click="disable2FA" class="disable-btn" :disabled="twoFactorLoading">
            {{ twoFactorLoading ? 'Disabling...' : 'Disable 2FA' }}
          </button>
        </div>

        <div v-if="showTwoFactorForm" class="confirmation-form">
          <p class="form-label">Enter the 6-digit code sent to your email:</p>
          <input
            v-model="twoFactorCode"
            type="text"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            class="code-input"
            @input="twoFactorCode = twoFactorCode.replace(/[^0-9]/g, '')"
          />
          <button @click="confirm2FA" class="confirm-btn" :disabled="twoFactorLoading || twoFactorCode.length !== 6">
            {{ twoFactorLoading ? 'Confirming...' : 'Confirm Code' }}
          </button>
        </div>

        <div v-if="twoFactorMessage" class="message-box" :class="{ error: twoFactorMessage.includes('✗') }">
          {{ twoFactorMessage }}
        </div>
      </div>
    </div>
  </div>

  <!-- Logout Button -->
  <button v-if="isAuthenticated" @click="logout" class="logout-btn">Logout</button>
</template>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  width: 100%;
  height: 100vh;
  padding-top: 3rem;
  padding-left: 2rem;
  padding-right: 2rem;
  overflow-x: auto;
  overflow-y: auto;
}

.card {
  background-color: #2c2c2c;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
  width: 100%;
  max-width: 450px;
  min-width: 350px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.title {
  color: #ffffff;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.description {
  color: #a1a1aa;
  margin: 0;
  font-size: 0.9rem;
}

.connect-btn {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.connect-btn:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.connect-btn:disabled {
  background-color: #4b5563;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.chat-container {
  width: 100%;
  height: 250px;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  background-color: #3a3a3a;
  color: #e0e0e0;
  padding: 10px;
  border-radius: 5px;
  font-size: 0.9rem;
  word-break: break-word;
}

.message.empty {
  color: #666;
  font-size: 0.85rem;
  background-color: transparent;
}

.message-box {
  background-color: rgba(66, 184, 131, 0.1);
  border: 1px solid rgba(66, 184, 131, 0.3);
  padding: 12px;
  border-radius: 8px;
  color: #42b883;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 500;
  animation: slideUp 0.3s ease-out;
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: #42b883;
  border-radius: 50%;
  box-shadow: 0 0 8px #42b883;
}

.timer {
  color: #42b883;
  font-weight: 600;
  font-size: 1.2rem;
}

.logout-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  z-index: 1000;
}

.logout-btn:hover {
  background-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
}

.logout-btn:active {
  transform: translateY(0);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 30px;
}

.spinner {
  border: 4px solid #444;
  border-top: 4px solid #42b883;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-box {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background-color: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 15px;
  border: 2px solid #ff6b6b;
}

.status-box.enabled {
  border-color: #42b883;
}

.status-indicator {
  width: 12px;
  height: 12px;
  background-color: #ff6b6b;
  border-radius: 50%;
  box-shadow: 0 0 8px #ff6b6b;
  flex-shrink: 0;
}

.status-box.enabled .status-indicator {
  background-color: #42b883;
  box-shadow: 0 0 8px #42b883;
}

.status-title {
  color: #a1a1aa;
  margin: 0;
  font-size: 0.85rem;
}

.status-value {
  color: #ffffff;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.enable-btn, .disable-btn, .confirm-btn {
  flex: 1;
  background-color: #42b883;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.disable-btn {
  background-color: #ff6b6b;
}

.enable-btn:hover:not(:disabled), .confirm-btn:hover:not(:disabled) {
  background-color: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.disable-btn:hover:not(:disabled) {
  background-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.enable-btn:disabled, .disable-btn:disabled, .confirm-btn:disabled {
  background-color: #4b5563;
  cursor: not-allowed;
  transform: none;
}

.confirmation-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 15px;
}

.form-label {
  color: #a1a1aa;
  margin: 0;
  font-size: 0.9rem;
}

.code-input {
  padding: 10px;
  font-size: 20px;
  text-align: center;
  letter-spacing: 8px;
  border: 2px solid #3a3a3a;
  border-radius: 6px;
  background-color: #2c2c2c;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  transition: border-color 0.3s;
}

.code-input:focus {
  outline: none;
  border-color: #42b883;
}

.message-box.error {
  background-color: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>