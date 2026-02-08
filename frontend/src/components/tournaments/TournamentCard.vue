<script setup lang="ts">
/**
 * Tournament Card - Individual Card for Browse Page
 * Shows tournament summary with game, date, status, participants
 */

import type { Tournament } from '../../data/mockTournaments'
import { useRouter } from 'vue-router'

defineProps<{
  tournament: Tournament
}>()

const router = useRouter()

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
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getProgressPercentage = (current: number, max: number) => {
  return Math.round((current / max) * 100)
}
</script>

<template>
  <div class="tournament-card glass-panel">
    <!-- Header -->
    <div class="tournament-card-header">
      <span class="tournament-game-icon">{{ tournament.organizer.avatar }}</span>
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
        <span class="detail-label">Date</span>
        <span class="detail-value">{{ tournament.date }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Format</span>
        <span class="detail-value">{{ tournament.format }}</span>
      </div>
    </div>

    <!-- Participants Progress -->
    <div class="tournament-participants">
      <div class="participants-info">
        <span class="participants-label">Participants</span>
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
    <div class="tournament-prize">
      <span class="prize-label">Prize Pool:</span>
      <span class="prize-value">{{ tournament.prize }}</span>
    </div>

    <!-- CTA Button -->
    <button
      class="tournament-card-cta"
      @click="handleViewDetails(tournament.id, $event)"
    >
      VIEW DETAILS
    </button>
  </div>
</template>

<style scoped>
.tournament-card {
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: all var(--duration-normal) var(--ease-default);
}

.tournament-card:hover {
  box-shadow:
    0 0 20px var(--accent-primary-subtle),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
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
  font-size: var(--text-2xl);
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
  background: var(--color-success);
  color: white;
}

.status-live {
  background: var(--color-warning);
  color: white;
  animation: pulse-status 2s ease-in-out infinite;
}

.status-finished {
  background: var(--text-secondary);
  color: white;
}

@keyframes pulse-status {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

.tournament-card-cta {
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
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.tournament-card-cta:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
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
