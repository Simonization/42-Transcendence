<script setup lang="ts">
/**
 * JoinPage — opens a team invite link (/join/:code).
 * A logged-out visitor is sent to /auth and brought back here after signing in.
 */

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAccessToken } from '../api'
import { useAuthStore } from '../stores/auth'
import { useTeams } from '../composables/useTeams'
import { savePendingRedirect } from '../utils/postLoginRedirect'

const REDIRECT_DELAY = 1200

type State = 'joining' | 'success' | 'error'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { joinByCode, error: joinError } = useTeams()

const state = ref<State>('joining')
const errorMessage = ref('')
const tournamentId = ref<number | null>(null)

async function run() {
  state.value = 'joining'
  errorMessage.value = ''

  const authenticated = getAccessToken() ? await authStore.checkAuth() : false
  if (!authenticated) {
    savePendingRedirect(route.fullPath)
    router.replace('/auth')
    return
  }

  const code = String(route.params.code ?? '')
  const result = code ? await joinByCode(code) : null
  if (!result) {
    state.value = 'error'
    errorMessage.value = joinError.value || t('join.invalid')
    return
  }

  tournamentId.value = result.tournamentId ?? null
  state.value = 'success'
  setTimeout(goToTeam, REDIRECT_DELAY)
}

function goToTeam() {
  router.push(
    tournamentId.value != null
      ? `/menu/tournaments/${tournamentId.value}/team`
      : '/menu/tournaments',
  )
}

onMounted(run)
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <!-- Joining -->
      <div v-if="state === 'joining'" class="state-container">
        <div class="spinner"></div>
        <h2 class="state-title">{{ t('join.title') }}</h2>
        <p class="state-text">{{ t('join.joining') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="state-container">
        <div class="state-icon state-icon-success">&#x2713;</div>
        <h2 class="state-title">{{ t('join.success') }}</h2>
        <button class="join-btn" @click="goToTeam">{{ t('join.goToTeam') }}</button>
      </div>

      <!-- Error -->
      <div v-else class="state-container">
        <div class="state-icon state-icon-error">&#x2715;</div>
        <h2 class="state-title">{{ t('join.failed') }}</h2>
        <p class="state-text" role="alert">{{ errorMessage }}</p>
        <button class="join-btn" @click="run">{{ t('join.retry') }}</button>
        <button class="join-btn join-btn-secondary" @click="router.push('/menu/tournaments')">
          {{ t('join.goToTournaments') }}
        </button>
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
  text-align: center;
}

.state-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.state-icon {
  width: 64px;
  height: 64px;
  -webkit-clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.state-icon-success {
  background: rgba(52, 211, 153, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.state-icon-error {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.join-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--text-primary);
  border: 1px solid transparent;
  -webkit-clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.join-btn:hover {
  background: var(--bg-secondary);
}

.join-btn-secondary {
  margin-top: var(--space-2);
  background: transparent;
  color: var(--text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.join-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}
</style>
