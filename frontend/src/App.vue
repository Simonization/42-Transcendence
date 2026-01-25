<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const message = ref('')
const isLoading = ref(false)
const chatMessages = ref<string[]>([])

const timer = ref('0.0')
let timerInterval: any = null
let startTime: number = 0

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

onMounted(() => {
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
    const now = Date.now()
    const diff = now - startTime
    timer.value = (diff / 1000).toFixed(1)
  }, 100)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="wrapper">
    <div class="card">
      <h1 class="title">Transcendence</h1>
      <p class="description">Test for Backend-Frontend connection</p>

      <div class="timer-display">
        <span class="timer-label">Session Time:</span>
        <span class="timer-value">{{ timer }}s</span>
      </div>

      <button @click="fetchData" class="connect-btn" :disabled="isLoading">
        {{ isLoading ? 'Connecting...' : "Connect to Backend" }}
      </button>

      <div v-if="message" class="message-box">
        <span class="status-dot"></span>
        {{ message }}
      </div>
      
      <div class="chat-section">
        <h3 class="chat-title">Live Chat Test</h3>
        <ul class="chat-list">
          <li v-for="msg in chatMessages" :key="msg" class="chat-item">
            {{ msg }}
          </li>
          <li v-if="chatMessages.length === 0" style="color: #666; font-size: 0.8rem;">
            no message yet..
          </li>
        </ul>
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
  background-color: #1a1a1a;
  font-family: 'Inter', sans-serif;
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
  width: 100%;
  height: 100vh;
  padding-top: 15vh; 
}

.card {
  background-color: #2c2c2c;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.timer-display {
  background-color: #1a1a1a;
  border: 1px solid #444;
  padding: 10px 20px;
  border-radius: 50px; 
  font-family: 'Courier New', monospace;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
}

.timer-label {
  color: #888;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.timer-value {
  color: #ffcc00;
  font-size: 1.2rem;
  font-weight: bold;
  min-width: 60px;
  text-align: right;
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

.chat-section {
  width: 100%;
  margin-top: 20px;
  border-top: 1px solid #444;
  padding-top: 20px;
}

.chat-title {
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.chat-list {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  max-height: 150px;
  overflow-y: auto;
}

.chat-item {
  background-color: #3a3a3a;
  padding: 8px 12px;
  margin-bottom: 5px;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 0.9rem;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>