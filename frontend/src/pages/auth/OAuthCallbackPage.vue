<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { setTokens, clearTokens } from '../../api'

const router = useRouter()
const route = useRoute()
const { checkAuth } = useAuth()

onMounted(async () => {
  const { accessToken, refreshToken } = route.query

  if (accessToken) {
    // Store tokens first so API client can use them
    setTokens(accessToken as string, refreshToken as string)

    // Validate tokens by calling backend
    const isValid = await checkAuth()

    if (isValid) {
      router.push('/menu')
    } else {
      // Validation failed, clear tokens and redirect
      clearTokens()
      router.push('/auth?error=oauth_failed')
    }
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
</style>
