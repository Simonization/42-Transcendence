<script setup lang="ts">
import { onMounted } from 'vue'
import { useTwoFactor } from '../../composables/useTwoFactor'

const { 
  enabled, loading, message, showForm, code, isFetching,
  fetchStatus, enable, confirm, disable 
} = useTwoFactor()

onMounted(() => {
  fetchStatus()
})
</script>

<template>
  <div class="card">
    <h1 class="title">2FA Security</h1>
    <p class="description">Two-Factor Authentication</p>

    <div v-if="isFetching" class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading 2FA status...</p>
    </div>

    <div v-else style="width: 100%">
      <div class="status-box" :class="{ enabled: enabled }">
        <span class="status-indicator"></span>
        <div>
          <p class="status-title">2FA Status</p>
          <p class="status-value">{{ enabled ? 'ENABLED' : 'DISABLED' }}</p>
        </div>
      </div>

      <div v-if="!enabled" class="actions">
        <button @click="enable" class="enable-btn" :disabled="loading">
          {{ loading ? 'Sending...' : 'Enable 2FA' }}
        </button>
      </div>

      <div v-else class="actions">
        <button @click="disable" class="disable-btn" :disabled="loading">
          {{ loading ? 'Disabling...' : 'Disable 2FA' }}
        </button>
      </div>

      <div v-if="showForm" class="confirmation-form">
        <p class="form-label">Enter the 6-digit code sent to your email:</p>
        <input
          v-model="code"
          type="text"
          placeholder="000000"
          maxlength="6"
          inputmode="numeric"
          class="code-input"
          @input="code = code.replace(/[^0-9]/g, '')"
        />
        <button @click="confirm" class="confirm-btn" :disabled="loading || code.length !== 6">
          {{ loading ? 'Confirming...' : 'Confirm Code' }}
        </button>
      </div>

      <div v-if="message" class="message-box" :class="{ error: message.includes('✗') }">
        {{ message }}
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
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.title { color: #ffffff; margin: 0; font-size: 2rem; font-weight: 700; }
.description { color: #a1a1aa; margin: 0; font-size: 0.9rem; }

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 30px;
  color: #a1a1aa;
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
  text-align: left;
}

.status-box.enabled { border-color: #42b883; }

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

.status-title { color: #a1a1aa; margin: 0; font-size: 0.85rem; }
.status-value { color: #ffffff; margin: 0; font-size: 1.1rem; font-weight: 600; }

.actions { display: flex; gap: 10px; margin-bottom: 15px; width: 100%; }

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

.disable-btn { background-color: #ff6b6b; }

.enable-btn:hover:not(:disabled), .confirm-btn:hover:not(:disabled) {
  background-color: #3aa876;
  transform: translateY(-2px);
}
.disable-btn:hover:not(:disabled) {
  background-color: #ff5252;
  transform: translateY(-2px);
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

.form-label { color: #a1a1aa; margin: 0; font-size: 0.9rem; text-align: left; }

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
  width: 100%;
}

.code-input:focus { outline: none; border-color: #42b883; }

.message-box {
  background-color: rgba(66, 184, 131, 0.1);
  border: 1px solid rgba(66, 184, 131, 0.3);
  padding: 12px;
  border-radius: 8px;
  color: #42b883;
  width: 100%;
  font-weight: 500;
}

.message-box.error {
  background-color: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}
</style>