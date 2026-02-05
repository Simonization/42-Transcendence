<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

onMounted(() => {
  const { accessToken, refreshToken } = route.query

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken as string)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken as string)
    }
    router.push('/menu')
  } else {
    router.push('/auth?error=oauth_failed')
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="state-container">
        <div class="spinner"></div>
        <h2 class="state-title">AUTHENTICATING</h2>
        <p class="state-text">Redirecting...</p>
      </div>
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
}

.auth-panel {
  width: 100%;
  max-width: 420px;
  padding: var(--space-12) var(--space-8);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: #e8e6e3;
  margin: 0;
}

.state-text {
  font-size: var(--text-sm);
  color: #6b7280;
  margin: 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
