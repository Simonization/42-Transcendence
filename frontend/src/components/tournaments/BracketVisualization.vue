<script setup lang="ts">
/**
 * Tournament Bracket Visualization
 * Interactive single-elimination bracket with accessibility, animations, and mobile optimization
 */

import { ref, computed } from 'vue'
import type { TournamentBracket, BracketMatch } from '../../types'
import { getWinnerOfMatch } from '../../utils/bracket'

const props = defineProps<{
  bracket: TournamentBracket
  tournamentName?: string
}>()

defineEmits<{
  (e: 'match-click', matchId: string): void
}>()

const expandedMatchId = ref<string | null>(null)
const bracketRef = ref<HTMLElement | null>(null)

const champion = computed(() => {
  // Find the winner of the final match (last round, first match)
  if (props.bracket.rounds.length > 0) {
    const finalRound = props.bracket.rounds[props.bracket.rounds.length - 1]
    if (finalRound.matches.length > 0) {
      const finalMatch = finalRound.matches[0]
      return getWinnerOfMatch(finalMatch)
    }
  }
  return null
})

const fieldSize = computed(() => {
  const first = props.bracket.rounds[0]
  if (!first) return 0
  return first.matches
    .flatMap(m => [m.player1, m.player2])
    .filter(p => p && p.id !== 'bye').length
})

const liveCount = computed(() =>
  props.bracket.rounds.flatMap(r => r.matches).filter(m => m.status === 'live').length,
)

const stageLabel = computed(() => {
  if (props.bracket.provisional) return 'SEEDING'
  if (champion.value) return 'COMPLETE'
  return liveCount.value > 0 ? 'LIVE' : 'READY'
})

function matchStatusClass(match: BracketMatch) {
  return {
    'match-completed': match.status === 'completed',
    'match-live': match.status === 'live',
    'match-upcoming': match.status === 'upcoming',
  }
}

function matchAriaLabel(match: BracketMatch): string {
  const p1 = match.player1?.username ?? 'TBD'
  const p2 = match.player2?.username ?? 'TBD'
  const score = match.status === 'completed' ? `, score ${match.score1} to ${match.score2}` : ''
  const status = match.status === 'live' ? ', currently live' : ''
  return `${p1} versus ${p2}${score}${status}`
}

function toggleMatch(matchId: string) {
  expandedMatchId.value = expandedMatchId.value === matchId ? null : matchId
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="bracket-container">
    <!-- Seeded from registrations; the field can still change until an admin starts. -->
    <div v-if="bracket.provisional" class="provisional-banner">
      <span class="provisional-tag">PROVISIONAL</span>
      <span class="provisional-text">
        Seeded from current registrations. Re-seeds as teams join, and is replaced by the real
        draw when the tournament starts.
      </span>
    </div>

    <!-- Champion Banner -->
    <div v-if="champion" class="champion-banner glass-panel">
      <div class="champion-content">
        <span class="champion-label">CHAMPION</span>
        <span class="champion-name">{{ champion.username }}</span>
      </div>
      <div class="readout">
        <span class="readout-value">{{ String(champion.seed || 1).padStart(2, '0') }}</span>
        <span class="readout-label">SEED</span>
      </div>
    </div>

    <!-- Corner-anchored instrument cluster: values read off the bracket itself. -->
    <div class="bracket-cluster">
      <div class="readout">
        <span class="readout-value">{{ String(fieldSize).padStart(2, '0') }}</span>
        <span class="readout-label">Field</span>
      </div>
      <div class="cluster-rule" aria-hidden="true"></div>
      <div class="readout">
        <span class="readout-value">{{ String(bracket.rounds.length).padStart(2, '0') }}</span>
        <span class="readout-label">Rounds</span>
      </div>
      <div class="cluster-rule" aria-hidden="true"></div>
      <div class="readout">
        <span class="readout-value" :class="{ 'readout-live': liveCount > 0 }">
          {{ String(liveCount).padStart(2, '0') }}
        </span>
        <span class="readout-label">Live</span>
      </div>
      <span class="cluster-stage">{{ stageLabel }}</span>
    </div>

    <!-- Bracket Visualization -->
    <div ref="bracketRef" class="bracket-viz reg-marks" role="region" aria-label="Tournament bracket">
      <div class="bracket-grid">
        <!-- Rounds -->
        <div v-for="(round, ri) in bracket.rounds" :key="ri" class="bracket-column" :style="{ animationDelay: `${ri * 100}ms` }">
          <h3 class="round-heading">{{ round.label }}</h3>

          <div class="round-matches">
            <!-- Matches -->
            <article
              v-for="match in round.matches"
              :key="match.id"
              class="match-card glass-panel"
              :class="matchStatusClass(match)"
              role="button"
              :aria-expanded="expandedMatchId === match.id"
              :aria-label="matchAriaLabel(match)"
              tabindex="0"
              @click="toggleMatch(match.id)"
              @keydown.enter="toggleMatch(match.id)"
              @keydown.space.prevent="toggleMatch(match.id)"
            >
              <!-- Player 1 -->
              <div class="player-slot" :class="{ winner: match.winnerId === match.player1?.id }">
                <span class="player-seed">{{ match.player1?.seed ? String(match.player1!.seed).padStart(2, '0') : '--' }}</span>
                <span class="player-name">{{ match.player1?.username ?? 'TBD' }}</span>
                <span class="player-score">{{ match.score1 ?? '·' }}</span>
              </div>

              <!-- Divider with status indicator -->
              <div class="match-divider">
                <span class="match-status-dot" :class="match.status" :aria-hidden="true"></span>
              </div>

              <!-- Player 2 -->
              <div class="player-slot" :class="{ winner: match.winnerId === match.player2?.id }">
                <span class="player-seed">{{ match.player2?.seed ? String(match.player2!.seed).padStart(2, '0') : '--' }}</span>
                <span class="player-name">{{ match.player2?.username ?? 'TBD' }}</span>
                <span class="player-score">{{ match.score2 ?? '·' }}</span>
              </div>

              <!-- Expanded Detail Panel -->
              <Transition name="expand">
                <div v-if="expandedMatchId === match.id" class="match-detail">
                  <div class="detail-row">
                    <span class="detail-label">STATUS</span>
                    <span class="detail-value" :class="match.status">{{ match.status.toUpperCase() }}</span>
                  </div>
                  <div v-if="match.player1" class="detail-row">
                    <span class="detail-label">{{ match.player1.username }}</span>
                    <span class="detail-value">Rating: {{ match.player1.rating }} | Seed: #{{ match.player1.seed }}</span>
                  </div>
                  <div v-if="match.player2" class="detail-row">
                    <span class="detail-label">{{ match.player2.username }}</span>
                    <span class="detail-value">Rating: {{ match.player2.rating }} | Seed: #{{ match.player2.seed }}</span>
                  </div>
                  <div v-if="match.status === 'completed'" class="detail-row">
                    <span class="detail-label">COMPLETED</span>
                    <span class="detail-value">{{ formatDate(match.completedAt!) }}</span>
                  </div>
                  <div v-else class="detail-row">
                    <span class="detail-label">SCHEDULED</span>
                    <span class="detail-value">{{ formatDate(match.scheduledAt) }}</span>
                  </div>
                </div>
              </Transition>
            </article>
          </div>
        </div>
      </div>

      <!-- Mobile Round Indicators -->
      <div class="round-indicators" aria-hidden="true">
        <span v-for="(round, ri) in bracket.rounds" :key="ri" class="round-dot"></span>
      </div>
    </div>

    <!-- Accessibility Help Text (visually hidden) -->
    <p class="visually-hidden">Tournament bracket. Use arrow keys to scroll horizontally on mobile. Press Enter or Space to expand match details. Click any match card to see more information.</p>
  </div>
</template>

<style scoped>
/* Visually Hidden */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.bracket-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.bracket-cluster {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-top: var(--hud-border) solid var(--border-default);
  border-bottom: var(--hud-border) solid var(--border-default);
}

.cluster-rule {
  align-self: stretch;
  width: 1px;
  background: var(--border-subtle);
}

.cluster-stage {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  color: var(--text-secondary);
}

.readout-live {
  color: var(--live);
}

[data-theme='dragon'] .readout-live {
  text-shadow: 0 0 2px rgba(255, 45, 85, 0.85);
}

.provisional-banner {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-4);
  border: var(--hud-border) solid var(--color-warning);
  background: var(--color-warning-bg, rgba(234, 179, 8, 0.1));
}

.provisional-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--color-warning);
  white-space: nowrap;
}

.provisional-text {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  min-width: 0;
}

/* Champion Banner */
.champion-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: linear-gradient(135deg, var(--glass-bg-elevated) 0%, var(--accent-primary-subtle) 100%);
  border: var(--hud-border) solid var(--accent-primary-subtle);
}

.champion-icon {
  font-size: var(--text-3xl);
}

.champion-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.champion-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

.champion-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

.champion-rating {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Bracket Container */
.bracket-viz {
  position: relative;
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-default);
  border-radius: 4px;
  padding: var(--space-6) 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bracket-grid {
  display: flex;
  gap: var(--space-4);
  padding: 0 var(--space-4);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.bracket-grid::-webkit-scrollbar {
  display: none;
}

.bracket-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 200px;
  flex-shrink: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  animation: bracket-round-in 180ms cubic-bezier(0.2, 0, 0, 1) backwards;
}

@keyframes bracket-round-in {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

.round-heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  text-align: center;
  padding-bottom: var(--space-2);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.round-matches {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  gap: var(--space-2);
}

/* Match Cards */
.match-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: var(--glass-bg-elevated);
  border: var(--hud-border) solid var(--glass-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  min-height: 100px;
  position: relative;
  overflow: hidden;
}

.match-card:hover {
  border-color: var(--accent-primary);
}

.match-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Status-based match card colors */
.match-card.match-completed {
  border-color: var(--color-success);
}

.match-card.match-live {
  border-color: var(--color-warning);
  animation: hud-pulse 2s ease-in-out infinite;
}

.match-card.match-upcoming {
  opacity: 0.7;
}

/* Player Slots */
.player-slot {
  display: grid;
  grid-template-columns: 2.25ch 1fr 2.5ch;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  transition: background-color var(--duration-fast) var(--ease-default);
}

.player-slot.winner {
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
}

/* The seed whispers. */
.player-seed {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--t-micro);
  font-weight: var(--font-thin);
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

.player-name {
  font-family: var(--font-display);
  font-size: var(--t-body);
  font-weight: var(--font-thin);
  color: inherit;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-slot.winner .player-name {
  font-weight: var(--font-heavy);
}

/* The number dominates, and never reflows as digits change. */
.player-score {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.375rem;
  font-weight: var(--font-heavy);
  line-height: 1;
  color: var(--text-tertiary);
  text-align: right;
}

.player-slot.winner .player-score {
  color: var(--accent-primary);
}

[data-theme='dragon'] .player-slot.winner .player-score {
  text-shadow: var(--shadow-glow);
}

/* A bracket reticle marks the live match: attention without occlusion. */
.match-live {
  position: relative;
}

.match-live::before,
.match-live::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: var(--live);
  pointer-events: none;
}

.match-live::before {
  top: -1px;
  left: -1px;
  border-top: var(--hud-border-thick) solid var(--live);
  border-left: var(--hud-border-thick) solid var(--live);
}

.match-live::after {
  bottom: -1px;
  right: -1px;
  border-bottom: var(--hud-border-thick) solid var(--live);
  border-right: var(--hud-border-thick) solid var(--live);
}

/* Match Divider */
.match-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1px;
  background: var(--glass-border);
}

.match-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: block;
  transition: all var(--duration-fast) var(--ease-default);
}

.match-status-dot.completed {
  background: var(--color-success);
}

.match-status-dot.live {
  background: var(--color-warning-dark);
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.match-status-dot.upcoming {
  background: var(--text-tertiary);
  opacity: 0.5;
}

/* Match Detail Panel */
.match-detail {
  padding: var(--space-3) var(--space-3);
  border-top: var(--hud-border) solid var(--glass-border);
  background: var(--bg-selected);
  max-height: 200px;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: var(--text-xs);

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-subtle);
  }
}

.detail-label {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  white-space: nowrap;
  text-transform: uppercase;
}

.detail-value {
  font-family: var(--font-display);
  color: var(--text-secondary);
  text-align: right;

  &.completed {
    color: var(--color-success);
  }

  &.live {
    color: var(--color-warning-dark);
  }

  &.upcoming {
    color: var(--text-tertiary);
  }
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all var(--duration-normal) var(--ease-default);
  max-height: 200px;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

/* Mobile Round Indicators */
.round-indicators {
  display: none;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) 0 0 0;
}

.round-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: 0.4;
  transition: all var(--duration-fast) var(--ease-default);
}

/* Responsive */
@media (max-width: 768px) {
  .bracket-column {
    min-width: calc(100% - var(--space-8) * 2);
  }

  .round-indicators {
    display: flex;
  }

  .bracket-grid {
    min-height: 400px;
    gap: var(--space-4);
    padding: 0 var(--space-4);
  }

  .match-card {
    min-height: 80px;
  }

  .player-slot {
    padding: var(--space-2) var(--space-2);
    gap: var(--space-1);
  }

  .player-name {
    font-size: var(--text-xs);
  }

  .champion-banner {
    flex-direction: column;
    text-align: center;
    padding: var(--space-3) var(--space-4);
  }

  .champion-content {
    width: 100%;
  }

  .champion-rating {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .bracket-column {
    min-width: calc(100% - var(--space-4) * 2);
  }

  .bracket-grid {
    min-height: 350px;
    gap: var(--space-3);
    padding: 0 var(--space-2);
  }

  .round-heading {
    font-size: var(--text-xs);
  }

  .match-detail {
    max-height: 160px;
    padding: var(--space-2);
  }

  .detail-row {
    padding: var(--space-1) 0;
    font-size: var(--text-xs);
  }
}

/* Prefers Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .bracket-column {
    animation: none;
  }

  .expand-enter-active,
  .expand-leave-active {
    transition: none;
  }

  .dot-pulse,
  .hud-pulse {
    animation: none;
  }
}
</style>
