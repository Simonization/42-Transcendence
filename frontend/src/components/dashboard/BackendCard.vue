<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const message = ref('')
const isLoading = ref(false)
const timer = ref('0.0')
let timerInterval: any = null
let startTime: number = 0

const fetchData = async () => {
  isLoading.value = true
  try {
    const response = await fetch('/api/')
    message.value = await response.text()
  } catch {
    message.value = 'Error: Network Problem'
  } finally { isLoading.value = false }
}

onMounted(() => {
  startTime = Date.now()
  timerInterval = setInterval(() => {
    timer.value = ((Date.now() - startTime) / 1000).toFixed(1)
  }, 100)
})

onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })
</script>

<template>
  <div class="card">
    <h1 class="title">Transcendence</h1>
    <p class="description">Backend Connection Test</p>
    <button @click="fetchData" class="connect-btn" :disabled="isLoading">
      {{ isLoading ? 'Connecting...' : "Connect" }}
    </button>
    <div v-if="message" class="message-box">
      <span class="status-dot"></span> {{ message }}
    </div>
    <p class="timer">{{ timer }}s</p>
  </div>
</template>

<style scoped>
.card { background-color: #2c2c2c; padding: 2rem; border-radius: 16px; width: 100%; max-width: 450px; display: flex; flex-direction: column; gap: 15px; }
.title { color: white; font-size: 2rem; font-weight: bold; margin: 0; }
.description { color: #a1a1aa; margin: 0; }
.connect-btn { background-color: #42b883; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; width: 100%; }
.message-box { background: rgba(66, 184, 131, 0.1); color: #42b883; padding: 10px; border-radius: 8px; }
.timer { color: #42b883; font-size: 1.2rem; font-weight: bold; }
</style>