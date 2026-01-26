<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import LoginPage from './components/LoginPage.vue'

const message = ref('')
const isLoading = ref(false)
const chatMessages = ref<string[]>([])
const isAuthenticated = ref(false)

const timer = ref('0.0')
let timerInterval: any = null
let startTime: number = 0

const checkAuth = async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    isAuthenticated.value = false
    return
  }
  
  try {
    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    isAuthenticated.value = response.ok
  } catch (error) {
    isAuthenticated.value = false
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
  <LoginPage v-if="!isAuthenticated" @auth-changed="checkAuth" />
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
  </div>
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

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>