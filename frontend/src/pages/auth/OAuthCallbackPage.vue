<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { setTokens, clearTokens } from '../../api'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const { checkAuth } = authStore

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
        <h2 class="state-title">{{ $t('oauth.processing') }}</h2>
        <p class="state-text">{{ $t('oauth.pleaseWait') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0;
}

.state-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}
</style>
