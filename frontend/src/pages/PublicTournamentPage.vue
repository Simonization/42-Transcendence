<script setup lang="ts">
/**
 * PublicTournamentPage — /t/:id. The shareable, read-only bracket: no login, no actions.
 * Data comes from GET /public/tournaments/:id, which carries no private user data.
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BracketVisualization from '../components/tournaments/BracketVisualization.vue'
import TournamentPodium from '../components/tournaments/TournamentPodium.vue'
import ShareTournamentButton from '../components/tournaments/ShareTournamentButton.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { publicApi, type PublicTournament } from '../api/public'
import { getAccessToken } from '../api'
import { buildBracket } from '../utils/bracket'
import { TournamentStatus } from '../types'

/** While a tournament is running, the page re-reads it so scores appear without a reload. */
const POLL_MS = 30_000

const { t } = useI18n()
const route = useRoute()

const tournament = ref<PublicTournament | null>(null)
const loading = ref(true)
const notFound = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const tournamentId = computed(() => Number(route.params.id) || null)
const bracket = computed(() => buildBracket(tournament.value))
const loggedIn = computed(() => !!getAccessToken())

const statusLabel = computed(() => {
  switch (tournament.value?.status) {
    case TournamentStatus.ONGOING: return t('public.statusLive')
    case TournamentStatus.COMPLETED: return t('public.statusCompleted')
    default: return t('public.statusOpen')
  }
})

const teamCount = computed(() => tournament.value?.seeding?.teams.length ?? tournament.value?.teams.length ?? 0)

async function load(quiet = false) {
  const id = tournamentId.value
  if (!id) {
    notFound.value = true
    loading.value = false
    return
  }
  if (!quiet) loading.value = true
  try {
    tournament.value = await publicApi.getTournament(id)
    notFound.value = false
  } catch {
    // Quiet refreshes keep what is on screen; a first load that fails reads as "not found".
    if (!tournament.value) notFound.value = true
  } finally {
    loading.value = false
  }
}

function schedule() {
  if (timer) clearInterval(timer)
  timer = tournament.value?.status === TournamentStatus.ONGOING ? setInterval(() => load(true), POLL_MS) : null
}

onMounted(async () => {
  await load()
  schedule()
  document.title = tournament.value ? `${tournament.value.name} — Esportendence` : 'Esportendence'
})
watch(tournamentId, async () => {
  tournament.value = null
  await load()
  schedule()
})
watch(() => tournament.value?.status, schedule)
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="public-page hud-boot">
    <header class="public-header glass-header">
      <div class="public-header-left">
        <router-link to="/" class="public-brand">ESPORTENDENCE</router-link>
        <span class="hud-serial">{{ t('public.readOnly') }}</span>
      </div>
      <div class="public-header-actions">
        <router-link :to="loggedIn ? '/menu/user' : '/auth'" class="public-cta">
          {{ loggedIn ? t('public.openApp') : t('public.signIn') }}
        </router-link>
        <ThemeToggle />
      </div>
    </header>

    <main class="public-main">
      <div v-if="loading" class="public-state" role="status">{{ t('public.loading') }}</div>

      <div v-else-if="notFound || !tournament" class="public-state" role="alert">
        <h1 class="public-state-title">{{ t('public.notFoundTitle') }}</h1>
        <p class="public-state-text">{{ t('public.notFoundText') }}</p>
        <router-link to="/" class="public-cta">{{ t('public.backHome') }}</router-link>
      </div>

      <template v-else>
        <div class="public-title-row">
          <div class="public-title-block">
            <h1 class="public-title">{{ tournament.name }}</h1>
            <p v-if="tournament.description" class="public-description">{{ tournament.description }}</p>
          </div>
          <div class="public-meta">
            <span class="public-status" :class="`status-${tournament.status.toLowerCase()}`">{{ statusLabel }}</span>
            <span class="public-count">
              <span class="num">{{ String(teamCount).padStart(2, '0') }}</span>
              {{ t('public.teams') }}
            </span>
            <ShareTournamentButton :tournament-id="tournament.id" />
          </div>
        </div>

        <TournamentPodium :podium="tournament.podium" />

        <BracketVisualization
          v-if="bracket"
          :bracket="bracket"
          :tournament-name="tournament.name"
          :tournament-status="tournament.status"
        />
        <p v-else class="public-state-text">{{ t('public.noBracket') }}</p>
      </template>
    </main>

    <footer class="public-footer glass-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM</span>
    </footer>
  </div>
</template>

<style scoped>
.public-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.public-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-4) var(--space-8);
}

.public-header-left,
.public-header-actions {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.public-header-actions {
  align-items: center;
}

.public-brand {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-decoration: none;
}

.public-cta {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--accent-primary);
  border: var(--hud-border) solid var(--accent-primary);
}

.public-cta:hover {
  background: var(--bg-selected);
}

.public-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.public-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.public-title-block {
  min-width: 0;
}

.public-title {
  margin: 0;
  font-size: var(--t-head);
  line-height: var(--lead-head);
  letter-spacing: var(--track-head);
  font-weight: var(--font-heavy);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.public-description {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  max-width: 70ch;
}

.public-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.public-status {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.public-status.status-ongoing {
  color: var(--live);
}

.public-count {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.public-count .num {
  font-size: var(--text-lg);
  font-weight: var(--font-heavy);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.public-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.public-state-title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
}

.public-state-text {
  margin: 0;
  color: var(--text-secondary);
}

.public-footer {
  padding: var(--space-4) var(--space-8);
}

@media (max-width: 480px) {
  .public-header,
  .public-footer {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
}
</style>
