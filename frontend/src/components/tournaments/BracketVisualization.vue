<script setup lang="ts">
/**
 * Tournament Bracket Visualization
 *
 * Group stage (standings + matchdays) and knockout rounds. With `interactive`, match cards carry
 * the match-loop actions the current user is allowed — report, confirm, dispute for team
 * captains/admins; resolve, undo, withdraw for global admins — and `changed` fires after each
 * one so the page can refetch.
 */

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TournamentBracket, BracketMatch } from '../../types'
import type { ReportScoreDto } from '../../types/tournament'
import { canOpenMatchChat, getWinnerOfMatch, matchPermissions, type MatchPermissions } from '../../utils/bracket'
import { matchesApi } from '../../api/matches'
import { tournamentsApi } from '../../api/tournaments'
import { useAuthStore } from '../../stores/auth'
import { useRbac } from '../../composables/useRbac'
import { useNotificationsStore } from '../../stores/notifications'
import { getErrorMessage } from '../../utils/error'
import BracketMatchCard from './BracketMatchCard.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'

const props = defineProps<{
  bracket: TournamentBracket
  tournamentName?: string
  /** Show match-loop actions. Off by default: read-only everywhere else. */
  interactive?: boolean
  /** Backend tournament status; actions other than undo need ONGOING. */
  tournamentStatus?: string
}>()

const emit = defineEmits<{
  (e: 'match-click', matchId: string): void
  (e: 'changed'): void
  /** A team member asked for the chat of this match (numeric match id). */
  (e: 'open-chat', matchId: number): void
}>()

const { t } = useI18n()
const auth = useAuthStore()
const { isAdmin } = useRbac()
const toasts = useNotificationsStore()

const expandedMatchId = ref<string | null>(null)
const busy = ref(false)

const champion = computed(() => {
  if (props.bracket.champion) return props.bracket.champion
  const finalRound = props.bracket.rounds[props.bracket.rounds.length - 1]
  return finalRound?.matches[0] ? getWinnerOfMatch(finalRound.matches[0]) : null
})

const groups = computed(() => props.bracket.groups ?? [])

const allMatches = computed(() => [
  ...groups.value.flatMap(g => g.rounds.flatMap(r => r.matches)),
  ...props.bracket.rounds.flatMap(r => r.matches),
])

const fieldSize = computed(() => {
  if (groups.value.length) {
    return groups.value.reduce((n, g) => n + Math.max(g.players.length, g.standings.length), 0)
  }
  const first = props.bracket.rounds[0]
  if (!first) return 0
  return first.matches.flatMap(m => [m.player1, m.player2]).filter(p => p && p.id !== 'bye').length
})

const liveCount = computed(() => allMatches.value.filter(m => m.status === 'live').length)
const roundCount = computed(
  () => props.bracket.rounds.length + (groups.value.length ? Math.max(0, ...groups.value.map(g => g.rounds.length)) : 0),
)

const stageLabel = computed(() => {
  if (props.bracket.provisional) return t('bracket.stageSeeding')
  if (champion.value) return t('bracket.stageComplete')
  return liveCount.value > 0 ? t('bracket.stageLive') : t('bracket.stageReady')
})

const live = computed(() => (props.tournamentStatus ?? 'ONGOING') === 'ONGOING')

function permissionsFor(match: BracketMatch): MatchPermissions {
  if (!props.interactive || props.bracket.provisional) {
    return { report: false, confirm: false, dispute: false, resolve: false, undo: false, withdraw: false }
  }
  return matchPermissions(match, auth.user?.id, isAdmin.value, live.value)
}

/** Members of either team get the match chat button; only where actions are shown. */
function chatFor(match: BracketMatch): boolean {
  return !!props.interactive && !props.bracket.provisional && canOpenMatchChat(match, auth.user?.id)
}

function toggleMatch(match: BracketMatch) {
  expandedMatchId.value = expandedMatchId.value === match.id ? null : match.id
  emit('match-click', match.id)
}

// --- actions ---

type Pending =
  | { kind: 'confirm' | 'dispute' | 'undo'; match: BracketMatch }
  | { kind: 'resolve'; match: BracketMatch; scores: ReportScoreDto }
  | { kind: 'withdraw'; match: BracketMatch; teamId: number; teamName: string }

const pending = ref<Pending | null>(null)

const scoreText = (m: BracketMatch, s1: number | null, s2: number | null) =>
  `${m.player1?.username ?? '?'} ${s1 ?? '·'} - ${s2 ?? '·'} ${m.player2?.username ?? '?'}`

const dialog = computed(() => {
  const p = pending.value
  if (!p) return null
  switch (p.kind) {
    case 'confirm':
      return {
        title: t('match.confirmTitle'),
        message: t('match.confirmMessage', { score: scoreText(p.match, p.match.score1, p.match.score2) }),
        label: t('match.confirmScore'),
        danger: false,
      }
    case 'dispute':
      return {
        title: t('match.disputeTitle'),
        message: t('match.disputeMessage', { score: scoreText(p.match, p.match.score1, p.match.score2) }),
        label: t('match.disputeScore'),
        danger: true,
      }
    case 'resolve':
      return {
        title: t('match.resolveTitle'),
        message: t('match.resolveMessage', { score: scoreText(p.match, p.scores.team1Score, p.scores.team2Score) }),
        label: t('match.resolve'),
        danger: false,
      }
    case 'undo':
      return { title: t('match.undoTitle'), message: t('match.undoMessage'), label: t('match.undo'), danger: true }
    case 'withdraw':
      return {
        title: t('match.withdrawTitle'),
        message: t('match.withdrawMessage', { team: p.teamName }),
        label: t('match.withdrawTeam', { team: p.teamName }),
        danger: true,
      }
  }
  return null
})

async function run(work: () => Promise<unknown>, done: string) {
  busy.value = true
  try {
    await work()
    toasts.success(done)
    emit('changed')
  } catch (e) {
    toasts.error(getErrorMessage(e, t('match.actionFailed')))
  } finally {
    busy.value = false
  }
}

function report(match: BracketMatch, scores: ReportScoreDto) {
  // Not final: the other team still confirms, so no dialog.
  return run(() => matchesApi.report(match.matchId!, scores), t('match.reported'))
}

async function confirmPending() {
  const p = pending.value
  if (!p) return
  pending.value = null
  const id = p.match.matchId!
  switch (p.kind) {
    case 'confirm':
      return run(() => matchesApi.confirm(id), t('match.confirmed'))
    case 'dispute':
      return run(() => matchesApi.dispute(id), t('match.disputed'))
    case 'resolve':
      return run(() => matchesApi.resolve(id, p.scores), t('match.resolved'))
    case 'undo':
      return run(() => matchesApi.undo(id), t('match.undone'))
    case 'withdraw':
      return run(
        () => tournamentsApi.withdrawTeam(Number(props.bracket.tournamentId), p.teamId),
        t('match.withdrawn', { team: p.teamName }),
      )
  }
}

function standingsKey(groupIndex: number) {
  return `group-${groupIndex}`
}
</script>

<template>
  <div class="bracket-container">
    <!-- Seeded from locked registrations; the field can still change until an admin starts. -->
    <div v-if="bracket.provisional" class="provisional-banner">
      <span class="provisional-tag">{{ t('bracket.provisional') }}</span>
      <span class="provisional-text">{{ t('bracket.provisionalText') }}</span>
    </div>

    <!-- Champion Banner -->
    <div v-if="champion" class="champion-banner">
      <div class="champion-content">
        <span class="champion-label">{{ t('bracket.champion') }}</span>
        <span class="champion-name">{{ champion.username }}</span>
      </div>
      <div class="readout">
        <span class="readout-value">{{ String(champion.seed || 1).padStart(2, '0') }}</span>
        <span class="readout-label">{{ t('bracket.seed') }}</span>
      </div>
    </div>

    <!-- Corner-anchored instrument cluster: values read off the bracket itself. -->
    <div class="bracket-cluster">
      <div class="readout">
        <span class="readout-value">{{ String(fieldSize).padStart(2, '0') }}</span>
        <span class="readout-label">{{ t('bracket.field') }}</span>
      </div>
      <div class="cluster-rule" aria-hidden="true"></div>
      <div class="readout">
        <span class="readout-value">{{ String(roundCount).padStart(2, '0') }}</span>
        <span class="readout-label">{{ t('bracket.rounds') }}</span>
      </div>
      <div class="cluster-rule" aria-hidden="true"></div>
      <div class="readout">
        <span class="readout-value" :class="{ 'readout-live': liveCount > 0 }">
          {{ String(liveCount).padStart(2, '0') }}
        </span>
        <span class="readout-label">{{ t('bracket.live') }}</span>
      </div>
      <span class="cluster-stage">{{ stageLabel }}</span>
    </div>

    <!-- Group stage -->
    <section v-if="groups.length" class="group-stage" :aria-label="t('bracket.groupStage')">
      <h3 class="stage-heading">{{ t('bracket.groupStage') }}</h3>
      <div class="group-grid">
        <div v-for="group in groups" :key="standingsKey(group.index)" class="group-panel">
          <h4 class="group-heading">{{ t('bracket.group', { label: group.label }) }}</h4>

          <table class="standings">
            <caption class="visually-hidden">{{ t('bracket.standingsCaption', { label: group.label }) }}</caption>
            <thead>
              <tr>
                <th scope="col" class="num">#</th>
                <th scope="col">{{ t('bracket.colTeam') }}</th>
                <th scope="col" class="num">{{ t('bracket.colPlayed') }}</th>
                <th scope="col" class="num">{{ t('bracket.colWins') }}</th>
                <th scope="col" class="num">{{ t('bracket.colLosses') }}</th>
                <th scope="col" class="num">{{ t('bracket.colDiff') }}</th>
                <th scope="col" class="num">{{ t('bracket.colPoints') }}</th>
              </tr>
            </thead>
            <tbody v-if="group.standings.length">
              <tr
                v-for="row in group.standings"
                :key="row.teamId"
                :class="{
                  qualifies: group.qualifiersPerGroup != null && row.rank <= group.qualifiersPerGroup && !row.withdrawn,
                  withdrawn: row.withdrawn,
                }"
              >
                <td class="num">{{ String(row.rank).padStart(2, '0') }}</td>
                <td class="team-cell">
                  {{ row.name }}
                  <span v-if="row.withdrawn" class="row-tag">{{ t('bracket.withdrawn') }}</span>
                </td>
                <td class="num">{{ row.played }}</td>
                <td class="num">{{ row.wins }}</td>
                <td class="num">{{ row.losses }}</td>
                <td class="num">{{ row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff }}</td>
                <td class="num points">{{ row.points }}</td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr v-for="(p, i) in group.players" :key="p.id">
                <td class="num">{{ String(i + 1).padStart(2, '0') }}</td>
                <td class="team-cell">{{ p.username }}</td>
                <td class="num">0</td>
                <td class="num">0</td>
                <td class="num">0</td>
                <td class="num">0</td>
                <td class="num points">0</td>
              </tr>
            </tbody>
          </table>
          <p v-if="group.qualifiersPerGroup" class="group-note">
            {{ t('bracket.qualifies', { n: group.qualifiersPerGroup }) }}
          </p>

          <div v-for="(round, ri) in group.rounds" :key="ri" class="matchday">
            <h5 class="round-heading">{{ round.label }}</h5>
            <div class="matchday-matches">
              <BracketMatchCard
                v-for="match in round.matches"
                :key="match.id"
                :match="match"
                :expanded="expandedMatchId === match.id"
                :permissions="permissionsFor(match)"
                :busy="busy"
                :can-chat="chatFor(match)"
                @open-chat="emit('open-chat', match.matchId!)"
                @toggle="toggleMatch(match)"
                @report="scores => report(match, scores)"
                @confirm="pending = { kind: 'confirm', match }"
                @dispute="pending = { kind: 'dispute', match }"
                @resolve="scores => (pending = { kind: 'resolve', match, scores })"
                @undo="pending = { kind: 'undo', match }"
                @withdraw="(teamId, teamName) => (pending = { kind: 'withdraw', match, teamId, teamName })"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Knockout -->
    <div
      v-if="bracket.rounds.length"
      class="bracket-viz reg-marks"
      role="region"
      :aria-label="t('bracket.regionLabel')"
    >
      <h3 v-if="groups.length" class="stage-heading stage-heading-inset">{{ t('bracket.knockout') }}</h3>
      <div class="bracket-grid">
        <div
          v-for="(round, ri) in bracket.rounds"
          :key="ri"
          class="bracket-column"
          :style="{ animationDelay: `${ri * 100}ms` }"
        >
          <h3 class="round-heading">{{ round.label }}</h3>

          <div class="round-matches">
            <BracketMatchCard
              v-for="match in round.matches"
              :key="match.id"
              :match="match"
              :expanded="expandedMatchId === match.id"
              :permissions="permissionsFor(match)"
              :busy="busy"
              :can-chat="chatFor(match)"
              @open-chat="emit('open-chat', match.matchId!)"
              @toggle="toggleMatch(match)"
              @report="scores => report(match, scores)"
              @confirm="pending = { kind: 'confirm', match }"
              @dispute="pending = { kind: 'dispute', match }"
              @resolve="scores => (pending = { kind: 'resolve', match, scores })"
              @undo="pending = { kind: 'undo', match }"
              @withdraw="(teamId, teamName) => (pending = { kind: 'withdraw', match, teamId, teamName })"
            />
          </div>
        </div>
      </div>

      <!-- Mobile Round Indicators -->
      <div class="round-indicators" aria-hidden="true">
        <span v-for="(round, ri) in bracket.rounds" :key="ri" class="round-dot"></span>
      </div>
    </div>

    <p class="visually-hidden">{{ t('bracket.helpText') }}</p>

    <ConfirmDialog
      v-if="dialog"
      :title="dialog.title"
      :message="dialog.message"
      :confirm-label="dialog.label"
      :danger="dialog.danger"
      @confirm="confirmPending"
      @cancel="pending = null"
    />
  </div>
</template>

<style scoped>
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

.champion-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--accent-primary-subtle);
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

/* Group stage */
.stage-heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  color: var(--text-secondary);
  text-transform: uppercase;
}

.stage-heading-inset {
  padding: 0 var(--space-4) var(--space-3);
}

.group-stage {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: var(--space-4);
}

.group-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-default);
  min-width: 0;
}

.group-heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-heavy);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.standings {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.standings th {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  text-align: left;
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.standings td {
  padding: var(--space-1) var(--space-2);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.standings .num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
  width: 3.5ch;
}

.standings .points {
  font-weight: var(--font-heavy);
  color: var(--text-primary);
}

.team-cell {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  max-width: 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.standings tr.qualifies td:first-child {
  box-shadow: inset 2px 0 0 var(--accent-primary);
}

.standings tr.qualifies .team-cell {
  color: var(--accent-primary);
}

.standings tr.withdrawn td {
  opacity: 0.55;
  text-decoration: line-through;
}

.row-tag {
  margin-left: var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--color-error);
}

.group-note {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.matchday {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.matchday-matches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: var(--space-2);
}

/* Knockout */
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
  /*
   * A small field has fewer columns than the frame is wide. Left-packed, that reads as a
   * bracket that failed to load; centred, it reads as a two-round bracket. `safe` keeps a
   * large field scrollable from its first round rather than clipping it off the left edge.
   */
  justify-content: safe center;
  gap: var(--space-4);
  padding: 0 var(--space-4);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
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
  /* Fixed width: an expanded match card must not widen its round and shove the next one. */
  width: 240px;
  min-width: 240px;
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

.matchday .round-heading {
  text-align: left;
}

.round-matches {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex: 1;
  gap: var(--space-2);
}

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
}

@media (max-width: 768px) {
  .bracket-column {
    width: calc(100% - var(--space-8) * 2);
    min-width: calc(100% - var(--space-8) * 2);
  }

  .round-indicators {
    display: flex;
  }

  .bracket-grid {
    min-height: 400px;
  }

  .champion-banner {
    flex-direction: column;
    text-align: center;
    padding: var(--space-3) var(--space-4);
  }

  .champion-content {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .bracket-column {
    width: calc(100% - var(--space-4) * 2);
    min-width: calc(100% - var(--space-4) * 2);
  }

  .bracket-grid {
    min-height: 350px;
    gap: var(--space-3);
    padding: 0 var(--space-2);
  }

  .group-panel {
    padding: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bracket-column {
    animation: none;
  }
}
</style>
