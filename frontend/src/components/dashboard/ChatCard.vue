<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

const chatMessages = ref<string[]>([])
let socket: Socket | null = null

onMounted(() => {
  socket = io('/', {
    path: '/socket.io/',
  })

  socket.on('connect', () => {
    console.log('Connected Chat Server! ID:', socket?.id)
  })

  socket.on('message', (msg: string) => {
    chatMessages.value.push(msg)
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<template>
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
</template>

<style scoped>
.card {
  background-color: #2c2c2c;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
  width: 100%;
  max-width: 450px;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-shrink: 0;
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
  text-align: left;
}

.message.empty {
  color: #666;
  font-size: 0.85rem;
  background-color: transparent;
  text-align: center;
}
</style>