<script setup lang="ts">
import { ref } from 'vue'

const message = ref('')
const isLoading = ref(false)

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
</script>

<template>
  <div class="wrapper">
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
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
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

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>