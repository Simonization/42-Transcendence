<script setup lang="ts">
/**
 * Tournament Card - Individual Card for Browse Page
 * Shows tournament summary with game, date, status, participants
 */

import type { Tournament } from '../../types'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import HudIcon from '../hud/HudIcon.vue'

const props = defineProps<{
  tournament: Tournament
  backendTournamentId?: number
  isRegistered?: boolean
}>()

const emit = defineEmits<{
  register: []
}>()

const router = useRouter()
const { t } = useI18n()

const handleViewDetails = (tournamentId: string, event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  router.push(`/menu/tournaments/${tournamentId}`)
}

const getStatusBadgeClass = (status: string) => {
  return {
    'status-open': status === 'open',
    'status-live': status === 'live',
    'status-finished': status === 'finished',
  }
}

const getStatusLabel = (status: string) => {
  const keyMap: Record<string, string> = {
    open: 'tournament.open',
    live: 'tournament.live',
    finished: 'tournament.finished',
  }
  const key = keyMap[status]
  return key ? t(key) : status.charAt(0).toUpperCase() + status.slice(1)
}

const getProgressPercentage = (current: number, max: number) => {
  return Math.round((current / max) * 100)
}
</script>

<template>
  <div class="tournament-card glass-panel">
    <!-- Header -->
    <div class="tournament-card-header">
      <HudIcon name="tournament" :size="22" class="tournament-game-icon" />
      <div class="tournament-card-title-section">
        <h3 class="tournament-card-title">{{ tournament.name }}</h3>
        <span class="tournament-game">{{ tournament.game }}</span>
      </div>
      <span class="tournament-status" :class="getStatusBadgeClass(tournament.status)">
        {{ getStatusLabel(tournament.status) }}
      </span>
    </div>

    <!-- Details -->
    <div class="tournament-card-details">
      <div class="detail-item">
        <span class="detail-label">{{ $t('tournament.date') }}</span>
        <span class="detail-value">{{ tournament.date }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">{{ $t('tournament.format') }}</span>
        <span class="detail-value">{{ tournament.format }}</span>
      </div>
    </div>

    <!-- Participants Progress -->
    <div class="tournament-participants">
      <div class="participants-info">
        <span class="participants-label">{{ $t('tournament.participants') }}</span>
        <span class="participants-value">
          {{ tournament.currentParticipants }}/{{ tournament.maxParticipants }}
        </span>
      </div>
      <div class="participants-bar">
        <div
          class="participants-progress"
          :style="{ width: `${getProgressPercentage(tournament.currentParticipants, tournament.maxParticipants)}%` }"
        ></div>
      </div>
    </div>

    <!-- Prize -->
    <div v-if="tournament.prize" class="tournament-prize">
      <span class="prize-label">{{ $t('tournament.prizePoolLabel') }}</span>
      <span class="prize-value">{{ tournament.prize }}</span>
    </div>

    <!-- Actions -->
    <div class="tournament-card-actions">
      <button
        class="tournament-card-cta"
        @click="handleViewDetails(tournament.id, $event)"
      >
        {{ $t('tournament.viewDetails') }}
      </button>
      <span v-if="props.isRegistered" class="tournament-card-registered">
        {{ $t('tournament.registered') }} ✓
      </span>
      <button
        v-else-if="tournament.status === 'open' && props.backendTournamentId"
        class="tournament-card-register"
        @click.stop="emit('register')"
      >
        {{ $t('tournament.registerNow') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tournament-card {
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  border: var(--hud-border) solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: all var(--duration-normal) var(--ease-default);
}

.tournament-card:hover {
  border-color: var(--accent-primary);
}

.tournament-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.tournament-game-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.tournament-card-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.tournament-card-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tournament-game {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.tournament-status {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  white-space: nowrap;
}

.status-open {
  background: transparent;
  color: var(--accent-primary);
  border: var(--hud-border) solid var(--accent-primary);
}

.status-live {
  background: var(--live);
  color: var(--bg-primary);
}

.status-finished {
  background: var(--text-secondary);
  color: white;
}


.tournament-card-details {
  display: flex;
  gap: var(--space-2);
}

.detail-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  font-size: var(--text-xs);
}

.detail-label {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.detail-value {
  font-family: var(--font-display);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.tournament-participants {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.participants-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-xs);
}

.participants-label {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.participants-value {
  font-family: var(--font-display);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.participants-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  overflow: hidden;
}

.participants-progress {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  transition: width var(--duration-normal) var(--ease-default);
}

.tournament-prize {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
}

.prize-label {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wide);
  font-weight: var(--font-semibold);
}

.prize-value {
  font-family: var(--font-display);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.tournament-card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tournament-card-cta {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.tournament-card-cta:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.tournament-card-cta:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.tournament-card-register {
  padding: var(--space-2) var(--space-4);
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

.tournament-card-register:hover {
  opacity: 0.85;
}

.tournament-card-register:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.tournament-card-registered {
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  border: var(--hud-border) solid var(--border-strong);
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 480px) {
  .tournament-card {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .tournament-card-title {
    font-size: var(--text-xs);
  }

  .tournament-card-details {
    flex-direction: column;
  }

  .detail-item {
    padding: var(--space-2);
  }
}
</style>
