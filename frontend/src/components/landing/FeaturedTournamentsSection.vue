<script setup lang="ts">
/**
 * Featured Tournaments Section - Landing Page
 * Fetches all planned/active tournaments from the backend and displays them in a carousel.
 */

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { tournamentsApi } from '../../api/tournaments'
import { getAccessToken } from '../../api'
import { TournamentStatus } from '../../types'
import type { BackendTournament } from '../../types'

const { t } = useI18n()
const router = useRouter()
const scrollContainer = ref<HTMLElement | null>(null)

const isLoggedIn = computed(() => !!getAccessToken())

const tournaments = ref<BackendTournament[]>([])
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    const all = await tournamentsApi.getAll()
    tournaments.value = all
      .filter(bt => bt.status !== TournamentStatus.COMPLETED)
      .sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt)
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        if (a.scheduledAt) return -1
        if (b.scheduledAt) return 1
        return 0
      })
  } catch {
    tournaments.value = []
  } finally {
    isLoading.value = false
  }
})

function handleRegister(bt: BackendTournament) {
  if (!isLoggedIn.value) {
    router.push('/auth')
    return
  }
  router.push(`/menu/tournaments/${bt.id}/team`)
}

const scroll = (direction: 'left' | 'right') => {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollTo({
    left: scrollContainer.value.scrollLeft + (direction === 'right' ? 320 : -320),
    behavior: 'smooth',
  })
}

function getStatusBadgeClass(status: TournamentStatus) {
  return {
    'status-open': status === TournamentStatus.REGISTRATION_OPEN,
    'status-live': status === TournamentStatus.ONGOING,
    'status-draft': status === TournamentStatus.DRAFT,
  }
}

function getStatusLabel(status: TournamentStatus): string {
  const map: Record<string, string> = {
    [TournamentStatus.DRAFT]: t('tournament.upcoming'),
    [TournamentStatus.REGISTRATION_OPEN]: t('tournament.open'),
    [TournamentStatus.ONGOING]: t('tournament.live'),
  }
  return map[status] ?? status
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return t('tournament.upcoming')
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getGameName(bt: BackendTournament): string {
  return bt.phases[0]?.game?.name ?? t('tournament.game')
}
</script>

<template>
  <section class="featured-section">
    <header class="featured-header">
      <div class="featured-header-content">
        <h2 class="featured-title">{{ $t('landing.featuredTournaments') }}</h2>
        <span class="featured-subtitle">{{ $t('landing.tournamentsCount', { count: tournaments.length }) }}</span>
      </div>
      <div class="featured-nav-buttons">
        <button class="featured-nav-btn" aria-label="Previous tournament" @click="scroll('left')">←</button>
        <button class="featured-nav-btn" aria-label="Next tournament" @click="scroll('right')">→</button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="featured-loading">
      <span class="loading-text">{{ $t('common.loadingDots') }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="tournaments.length === 0" class="featured-empty">
      <span class="featured-empty-icon">🏆</span>
      <p class="featured-empty-text">{{ $t('tournament.noTournamentsFound') }}</p>
    </div>

    <!-- Carousel -->
    <div v-else class="featured-carousel" role="region" aria-roledescription="carousel" aria-label="Featured tournaments">
      <div ref="scrollContainer" class="featured-scroll-container" role="group">
        <div
          v-for="(bt, index) in tournaments"
          :key="bt.id"
          class="featured-card glass-panel"
          role="group"
          :aria-label="`${bt.name} tournament, slide ${index + 1} of ${tournaments.length}`"
        >
          <!-- Card Header -->
          <div class="featured-card-header">
            <span class="featured-game-icon" aria-hidden="true">🏆</span>
            <div class="featured-game-info">
              <h3 class="featured-game-name">{{ getGameName(bt) }}</h3>
              <span class="featured-status" :class="getStatusBadgeClass(bt.status)">
                {{ getStatusLabel(bt.status) }}
              </span>
            </div>
          </div>

          <!-- Tournament Name -->
          <h4 class="featured-tournament-name">{{ bt.name }}</h4>

          <!-- Stats -->
          <div class="featured-stats">
            <div class="featured-stat">
              <span class="featured-stat-label">{{ $t('landing.date') }}</span>
              <span class="featured-stat-value">{{ formatDate(bt.scheduledAt) }}</span>
            </div>
            <div class="featured-stat">
              <span class="featured-stat-label">{{ $t('landing.players') }}</span>
              <span class="featured-stat-value">{{ bt.teams?.length ?? 0 }}/{{ bt.max_participants }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="featured-actions">
            <button
              class="featured-cta"
              :aria-label="`View details for ${bt.name}`"
              @click="router.push(`/menu/tournaments/${bt.id}`)"
            >
              {{ $t('landing.viewDetails') }}
            </button>
            <button
              v-if="bt.status === TournamentStatus.REGISTRATION_OPEN"
              class="featured-register"
              :aria-label="`Register for ${bt.name}`"
              @click="handleRegister(bt)"
            >
              {{ isLoggedIn ? $t('tournament.registerNow') : $t('landing.signIn') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

</template>

<style scoped>
.featured-section {
  margin-bottom: var(--space-12);
}

.featured-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding: 0 var(--space-4);
}

.featured-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.featured-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.featured-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.featured-nav-buttons {
  display: flex;
  gap: var(--space-2);
}

.featured-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.featured-nav-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.featured-nav-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.featured-loading,
.featured-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  gap: var(--space-4);
}

.loading-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-widest);
}

.featured-empty-icon {
  font-size: var(--text-4xl);
  opacity: 0.4;
}

.featured-empty-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.featured-carousel {
  overflow: hidden;
  padding: 0 var(--space-4);
}

.featured-scroll-container {
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--space-4);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.featured-scroll-container::-webkit-scrollbar {
  display: none;
}

.featured-card {
  flex: 0 0 calc(50% - var(--space-3));
  scroll-snap-align: start;
  scroll-snap-stop: always;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all var(--duration-normal) var(--ease-default);
}

.featured-card:hover {
  box-shadow: 0 0 20px var(--accent-primary-subtle), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.featured-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.featured-game-icon {
  font-size: var(--text-2xl);
}

.featured-game-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.featured-game-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
}

.featured-status {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: var(--space-1) var(--space-2);
  width: fit-content;
}

.status-open {
  background: var(--color-success-dark);
  color: white;
}

.status-live {
  background: var(--color-warning-dark);
  color: white;
  animation: pulse-badge 2s ease-in-out infinite;
}

.status-draft {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: var(--hud-border) solid var(--border-default);
}

@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.featured-tournament-name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--accent-primary);
  line-height: var(--leading-normal);
}

.featured-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.featured-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.featured-stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.featured-stat-value {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.featured-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
}

.featured-cta {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.featured-cta:hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.featured-cta:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.featured-register {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--accent-primary);
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}

.featured-register:hover {
  opacity: 0.85;
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.featured-register:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .featured-nav-buttons { display: none; }
  .featured-card { flex: 0 0 calc(85% - var(--space-3)); }
  .featured-card:last-child { margin-right: var(--space-4); }
}

@media (max-width: 480px) {
  .featured-header { padding: 0 var(--space-2); }
  .featured-carousel { padding: 0 var(--space-2); }
  .featured-card {
    flex: 0 0 calc(100% - var(--space-3));
    padding: var(--space-4);
  }
  .featured-tournament-name { font-size: var(--text-sm); }
  .featured-actions { flex-direction: column; }
}
</style>
