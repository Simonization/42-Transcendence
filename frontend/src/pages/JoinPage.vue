<script setup lang="ts">
/**
 * JoinPage — opens a team invite link (/join/:code).
 *
 * Shows what the code joins (team, tournament, roster count) and what joining would cost (the
 * user's other DRAFT teams in this tournament: left, captaincy handed on, or deleted when they
 * are alone in it). Nothing happens until the user clicks Join.
 * A logged-out visitor is sent to /auth and brought back here after signing in.
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAccessToken } from '../api'
import type { JoinPreview } from '../api/teams'
import { useAuthStore } from '../stores/auth'
import { useTeams } from '../composables/useTeams'
import { savePendingRedirect } from '../utils/postLoginRedirect'

const REDIRECT_DELAY = 1200

type State = 'loading' | 'preview' | 'joining' | 'success' | 'error'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { previewJoinByCode, joinByCode, error: joinError } = useTeams()

const state = ref<State>('loading')
const errorMessage = ref('')
const preview = ref<JoinPreview | null>(null)
const tournamentId = ref<number | null>(null)

const code = computed(() => String(route.params.code ?? ''))

const blockerText = computed(() => {
  const p = preview.value
  if (!p?.blocker) return ''
  return t(`join.blocker.${p.blocker}`, { team: p.lockedTeamName ?? '' })
})

/** Loads the preview; never joins. */
async function load() {
  state.value = 'loading'
  errorMessage.value = ''

  const authenticated = getAccessToken() ? await authStore.checkAuth() : false
  if (!authenticated) {
    savePendingRedirect(route.fullPath)
    router.replace('/auth')
    return
  }

  const result = code.value ? await previewJoinByCode(code.value) : null
  if (!result) {
    state.value = 'error'
    errorMessage.value = code.value && joinError.value ? joinError.value : t('join.invalid')
    return
  }
  preview.value = result
  state.value = 'preview'
}

/** The only place that joins: the user clicked Join. */
async function join() {
  if (!preview.value || preview.value.blocker) return
  state.value = 'joining'
  const result = await joinByCode(code.value)
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

onMounted(load)
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <!-- Loading the preview / joining -->
      <div v-if="state === 'loading' || state === 'joining'" class="state-container">
        <div class="spinner"></div>
        <h2 class="state-title">{{ t('join.title') }}</h2>
        <p class="state-text">{{ state === 'joining' ? t('join.joining') : t('join.loading') }}</p>
      </div>

      <!-- Preview: what the code joins, and what joining costs -->
      <div v-else-if="state === 'preview' && preview" class="state-container">
        <h2 class="state-title">{{ t('join.title') }}</h2>
        <dl class="join-facts">
          <dt>{{ t('join.team') }}</dt>
          <dd class="join-team">{{ preview.teamName }}</dd>
          <template v-if="preview.tournamentName">
            <dt>{{ t('join.tournament') }}</dt>
            <dd class="join-tournament">{{ preview.tournamentName }}</dd>
          </template>
          <dt>{{ t('join.roster') }}</dt>
          <dd>{{ t('join.members', { count: preview.memberCount, max: preview.maxMembers }) }}</dd>
        </dl>

        <p v-if="preview.blocker" class="join-blocker" role="alert">{{ blockerText }}</p>

        <div v-else-if="preview.leaving.length" class="join-warning" role="alert">
          <p class="join-warning-title">{{ t('join.leaveWarning') }}</p>
          <ul>
            <li v-for="d in preview.leaving" :key="d.teamId">
              <template v-if="d.deletes">{{ t('join.leaveDelete', { team: d.teamName }) }}</template>
              <template v-else-if="d.captain">{{ t('join.leaveCaptain', { team: d.teamName, successor: d.successor ?? '' }) }}</template>
              <template v-else>{{ t('join.leaveTeam', { team: d.teamName }) }}</template>
            </li>
          </ul>
        </div>

        <button v-if="!preview.blocker" class="join-btn join-confirm" @click="join">
          {{ t('join.join') }}
        </button>
        <button class="join-btn join-btn-secondary" @click="router.push('/menu/tournaments')">
          {{ t('join.cancel') }}
        </button>
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
        <button class="join-btn" @click="load">{{ t('join.retry') }}</button>
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

.join-facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2) var(--space-4);
  width: 100%;
  margin: var(--space-4) 0 0;
  font-size: var(--text-sm);
}

.join-facts dt {
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

.join-facts dd {
  margin: 0;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.join-team {
  font-weight: var(--font-bold);
}

.join-blocker,
.join-warning {
  width: 100%;
  margin: var(--space-4) 0 0;
  padding: var(--space-3);
  font-size: var(--text-sm);
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.join-warning-title {
  margin: 0 0 var(--space-2);
  font-weight: var(--font-semibold);
}

.join-warning ul {
  margin: 0;
  padding-left: var(--space-4);
}
</style>
