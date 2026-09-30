<script setup lang="ts">
/**
 * One match of the bracket: two slots with seeds and scores, a status tag, and — when expanded —
 * the match-loop actions the current user is allowed. Actions are only emitted; the parent owns
 * the API calls and the confirmation dialogs.
 */

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BracketMatch } from '../../types'
import type { ReportScoreDto } from '../../types/tournament'
import { isBye, type MatchPermissions } from '../../utils/bracket'

const props = defineProps<{
  match: BracketMatch
  expanded: boolean
  permissions: MatchPermissions
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'report', scores: ReportScoreDto): void
  (e: 'resolve', scores: ReportScoreDto): void
  (e: 'confirm'): void
  (e: 'dispute'): void
  (e: 'undo'): void
  (e: 'withdraw', teamId: number, teamName: string): void
}>()

const { t, locale } = useI18n()

const score1 = ref<number | null>(props.match.score1)
const score2 = ref<number | null>(props.match.score2)
watch(
  () => [props.match.score1, props.match.score2, props.expanded],
  () => {
    score1.value = props.match.score1
    score2.value = props.match.score2
  },
)

const scoresValid = computed(
  () =>
    Number.isInteger(score1.value) &&
    Number.isInteger(score2.value) &&
    score1.value! >= 0 &&
    score2.value! >= 0 &&
    score1.value !== score2.value,
)
const isDraw = computed(() => score1.value != null && score1.value === score2.value)
const scores = (): ReportScoreDto => ({ team1Score: score1.value!, team2Score: score2.value! })

const hasActions = computed(() => Object.values(props.permissions).some(Boolean))
const showScoreForm = computed(() => props.permissions.report || props.permissions.resolve)

const stateLabel = computed(() => {
  if (props.match.walkover) return t('bracket.walkover')
  switch (props.match.state) {
    case 'WAITING': return t('bracket.stateWaiting')
    case 'READY': return t('bracket.stateReady')
    case 'ONGOING': return t('bracket.stateOngoing')
    case 'AWAITING_CONFIRMATION': return t('bracket.stateAwaiting')
    case 'DISPUTED': return t('bracket.stateDisputed')
    case 'FINISHED': return t('bracket.stateFinished')
    case 'CANCELLED': return t('bracket.stateCancelled')
    case 'BYE': return t('bracket.stateBye')
    default:
      return props.match.status === 'completed' ? t('bracket.stateBye') : t('bracket.stateWaiting')
  }
})

const reporterName = computed(() => {
  const id = props.match.reportedByTeamId
  if (!id) return null
  return [props.match.player1, props.match.player2].find(p => p?.id === id)?.username ?? null
})

const withdrawable = computed(() =>
  [props.match.player1, props.match.player2].filter(
    (p): p is NonNullable<typeof p> => !!p && !isBye(p),
  ),
)

const name = (slot: 1 | 2) => {
  const p = slot === 1 ? props.match.player1 : props.match.player2
  return p ? (isBye(p) ? t('bracket.bye') : p.username) : t('bracket.tbd')
}

const seed = (slot: 1 | 2) => {
  const p = slot === 1 ? props.match.player1 : props.match.player2
  return p?.seed ? String(p.seed).padStart(2, '0') : '--'
}

const ariaLabel = computed(() => {
  const base = t('bracket.versus', { p1: name(1), p2: name(2) })
  const score =
    props.match.score1 != null && props.match.score2 != null
      ? `, ${t('bracket.scoreAria', { s1: props.match.score1, s2: props.match.score2 })}`
      : ''
  return `${base}${score}, ${stateLabel.value}`
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <article
    class="match-card"
    :class="{
      'match-completed': match.status === 'completed',
      'match-live': match.status === 'live',
      'match-upcoming': match.status === 'upcoming',
      'match-disputed': match.state === 'DISPUTED',
    }"
    role="button"
    :aria-expanded="expanded"
    :aria-label="ariaLabel"
    tabindex="0"
    @click="emit('toggle')"
    @keydown.enter.self="emit('toggle')"
    @keydown.space.self.prevent="emit('toggle')"
  >
    <div class="player-slot" :class="{ winner: match.winnerId != null && match.winnerId === match.player1?.id }">
      <span class="player-seed">{{ seed(1) }}</span>
      <span class="player-name">{{ name(1) }}</span>
      <span class="player-score">{{ match.score1 ?? '·' }}</span>
    </div>

    <div class="match-divider">
      <span class="match-state" :class="`state-${(match.state ?? match.status).toLowerCase()}`">{{ stateLabel }}</span>
    </div>

    <div class="player-slot" :class="{ winner: match.winnerId != null && match.winnerId === match.player2?.id }">
      <span class="player-seed">{{ seed(2) }}</span>
      <span class="player-name">{{ name(2) }}</span>
      <span class="player-score">{{ match.score2 ?? '·' }}</span>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="match-detail" @click.stop @keydown.stop>
        <div v-if="reporterName && match.state !== 'FINISHED'" class="detail-row">
          <span class="detail-label">{{ t('match.reportedBy') }}</span>
          <span class="detail-value">{{ reporterName }}</span>
        </div>
        <div v-if="match.status === 'completed' && match.completedAt" class="detail-row">
          <span class="detail-label">{{ t('bracket.completed') }}</span>
          <span class="detail-value">{{ formatDate(match.completedAt) }}</span>
        </div>
        <div v-for="slot in ([1, 2] as const)" :key="slot" class="detail-row">
          <span class="detail-label">{{ name(slot) }}</span>
          <span class="detail-value">
            {{ t('bracket.seedAndRoster', { seed: seed(slot), n: (slot === 1 ? match.player1 : match.player2)?.rating ?? 0 }) }}
          </span>
        </div>

        <p v-if="match.state === 'AWAITING_CONFIRMATION' && permissions.confirm" class="detail-note">
          {{ t('match.awaitingYou') }}
        </p>
        <p v-else-if="match.state === 'AWAITING_CONFIRMATION' && permissions.report" class="detail-note">
          {{ t('match.awaitingOpponent') }}
        </p>
        <p v-if="match.state === 'DISPUTED'" class="detail-note detail-note-alert">
          {{ t('match.disputedNotice') }}
        </p>

        <div v-if="hasActions" class="match-actions">
          <div v-if="showScoreForm" class="score-form">
            <label class="score-field">
              <span class="score-team">{{ name(1) }}</span>
              <input
                v-model.number="score1"
                type="number"
                min="0"
                max="9999"
                inputmode="numeric"
                class="score-input"
                :aria-label="t('match.scoreFor', { team: name(1) })"
              />
            </label>
            <label class="score-field">
              <span class="score-team">{{ name(2) }}</span>
              <input
                v-model.number="score2"
                type="number"
                min="0"
                max="9999"
                inputmode="numeric"
                class="score-input"
                :aria-label="t('match.scoreFor', { team: name(2) })"
              />
            </label>
            <p v-if="isDraw" class="detail-note detail-note-alert">{{ t('match.noDraws') }}</p>
          </div>

          <div class="action-row">
            <button
              v-if="permissions.report"
              class="action-btn action-primary"
              :disabled="busy || !scoresValid"
              @click="emit('report', scores())"
            >
              {{ t('match.reportScore') }}
            </button>
            <button v-if="permissions.confirm" class="action-btn action-primary" :disabled="busy" @click="emit('confirm')">
              {{ t('match.confirmScore') }}
            </button>
            <button v-if="permissions.dispute" class="action-btn action-danger" :disabled="busy" @click="emit('dispute')">
              {{ t('match.disputeScore') }}
            </button>
            <button
              v-if="permissions.resolve"
              class="action-btn action-admin"
              :disabled="busy || !scoresValid"
              @click="emit('resolve', scores())"
            >
              {{ t('match.resolve') }}
            </button>
            <button v-if="permissions.undo" class="action-btn action-admin" :disabled="busy" @click="emit('undo')">
              {{ t('match.undo') }}
            </button>
            <template v-if="permissions.withdraw">
              <button
                v-for="p in withdrawable"
                :key="p.id"
                class="action-btn action-danger"
                :disabled="busy"
                @click="emit('withdraw', Number(p.id), p.username)"
              >
                {{ t('match.withdrawTeam', { team: p.username }) }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.match-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: var(--glass-bg-elevated);
  border: var(--hud-border) solid var(--glass-border);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-default);
  min-height: 100px;
  position: relative;
}

.match-card:hover {
  border-color: var(--accent-primary);
}

.match-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.match-card.match-completed {
  border-color: var(--color-success);
}

.match-card.match-live {
  border-color: var(--color-warning);
}

.match-card.match-disputed {
  border-color: var(--live);
}

.match-card.match-upcoming {
  opacity: 0.85;
}

/* A bracket reticle marks the match in play: attention without occlusion. */
.match-live::before,
.match-live::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
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

.player-slot {
  display: grid;
  grid-template-columns: 2.25ch 1fr 3ch;
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

.match-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1px;
  background: var(--glass-border);
}

.match-state {
  padding: 0 var(--space-2);
  background: var(--glass-bg-elevated);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro, 0.16em);
  text-transform: uppercase;
  color: var(--text-tertiary);
  line-height: 1;
}

.state-finished,
.state-bye,
.state-completed {
  color: var(--color-success);
}

.state-ready {
  color: var(--data, var(--accent-primary));
}

.state-awaiting_confirmation,
.state-ongoing {
  color: var(--color-warning-dark, var(--color-warning));
}

.state-disputed {
  color: var(--live);
}

.match-detail {
  padding: var(--space-3);
  border-top: var(--hud-border) solid var(--glass-border);
  background: var(--bg-selected);
  cursor: default;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: var(--text-xs);
  border-bottom: 1px solid var(--border-subtle);
}

.detail-label {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
}

.detail-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  text-align: right;
}

.detail-note {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.detail-note-alert {
  color: var(--live);
}

.match-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.score-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-2);
}

.score-form .detail-note {
  grid-column: 1 / -1;
  margin: 0;
}

.score-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.score-team {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score-input {
  width: 100%;
  min-width: 0;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--text-base);
  font-weight: var(--font-heavy);
  text-align: right;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-default);
}

.score-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.action-btn {
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-heavy);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  background: transparent;
  border: var(--hud-border) solid currentColor;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-default);
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.action-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-primary {
  color: var(--accent-primary);
}

.action-admin {
  color: var(--text-secondary);
}

.action-danger {
  color: var(--color-error);
}

.expand-enter-active,
.expand-leave-active {
  transition: opacity var(--duration-normal) var(--ease-default);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .match-card {
    min-height: 80px;
  }

  .player-slot {
    padding: var(--space-2);
    gap: var(--space-1);
  }

  .player-name {
    font-size: var(--text-xs);
  }
}

@media (prefers-reduced-motion: reduce) {
  .expand-enter-active,
  .expand-leave-active {
    transition: none;
  }
}
</style>
