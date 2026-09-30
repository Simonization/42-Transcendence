<script setup lang="ts">
/**
 * Tournament Brackets Page
 *
 * With an id: the bracket, with the match-loop actions for the current user. Without one: the
 * tournaments to pick from.
 */

import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import TournamentPodium from '../../components/tournaments/TournamentPodium.vue'
import ShareTournamentButton from '../../components/tournaments/ShareTournamentButton.vue'
import HudIcon from '../../components/hud/HudIcon.vue'
import { useTournaments } from '../../composables/useTournaments'
import { tournamentsApi } from '../../api/tournaments'
import { useRbac } from '../../composables/useRbac'
import { buildBracket } from '../../utils/bracket'
import { TournamentStatus } from '../../types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { tournaments, currentTournament, isLoading, fetchTournament, fetchTournaments } = useTournaments()
const { isAdmin } = useRbac()

const tournamentId = computed(() => Number(route.params.id) || null)

function load() {
  if (tournamentId.value) fetchTournament(tournamentId.value)
  else fetchTournaments()
}

onMounted(load)
watch(tournamentId, load)

/** Refetch without the loading state, so the bracket does not flash away after an action. */
async function refresh() {
  if (!tournamentId.value) return
  try {
    currentTournament.value = await tournamentsApi.getById(tournamentId.value)
  } catch {
    await fetchTournament(tournamentId.value)
  }
}

const bracket = computed(() => (tournamentId.value ? buildBracket(currentTournament.value) : null))

const tournamentName = computed(() => (tournamentId.value ? currentTournament.value?.name ?? '' : ''))

const pickable = computed(() =>
  [...tournaments.value].sort((a, b) => {
    const rank = (s: string) =>
      s === TournamentStatus.ONGOING ? 0 : s === TournamentStatus.REGISTRATION_OPEN ? 1 : 2
    return rank(a.status) - rank(b.status) || b.id - a.id
  }),
)

function statusLabel(status: string): string {
  switch (status) {
    case TournamentStatus.ONGOING: return t('tournament.inProgress')
    case TournamentStatus.COMPLETED: return t('tournament.completed')
    default: return t('tournament.open')
  }
}

function open(id: number) {
  router.push({ name: 'tournament-brackets', params: { id } })
}
</script>

<template>
  <div class="card card-page glass-panel">
    <div class="card-header">
      <h2 class="card-title">{{ $t('tournament.brackets') }}</h2>
      <span v-if="tournamentName" class="hud-serial">{{ tournamentName }}</span>
      <ShareTournamentButton v-if="tournamentId" :tournament-id="tournamentId" />
      <button v-if="tournamentId" class="back-link" @click="router.push({ name: 'tournament-brackets' })">
        {{ t('bracket.allTournaments') }}
      </button>
    </div>

    <div class="card-body">
      <TournamentPodium v-if="tournamentId && !isLoading" :podium="currentTournament?.podium" link-teams />
      <div v-if="isLoading" class="bracket-loading">
        <div class="segbar" aria-hidden="true"></div>
        <span>{{ $t('common.loading') }}</span>
      </div>

      <!-- No id: pick a tournament -->
      <template v-else-if="!tournamentId">
        <p class="picker-intro">{{ t('bracket.pickTournament') }}</p>
        <ul v-if="pickable.length" class="picker-list">
          <li v-for="tr in pickable" :key="tr.id">
            <button class="picker-item" @click="open(tr.id)">
              <span class="picker-name">{{ tr.name }}</span>
              <span class="picker-meta">
                <span class="picker-count">{{ String(tr.teams?.length ?? 0).padStart(2, '0') }}</span>
                <span class="picker-status" :class="`status-${tr.status.toLowerCase()}`">{{ statusLabel(tr.status) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <div v-else class="bracket-guidance">
          <HudIcon name="brackets" :size="28" class="guidance-icon" />
          <h3 class="guidance-title">{{ t('bracket.noTournaments') }}</h3>
          <button v-if="isAdmin" class="guidance-btn" @click="router.push('/menu/admin')">
            {{ $t('tournament.goToAdmin') }}
          </button>
        </div>
      </template>

      <BracketVisualization
        v-else-if="bracket"
        :bracket="bracket"
        :tournament-name="tournamentName"
        :tournament-status="currentTournament?.status"
        interactive
        @changed="refresh"
      />
      <div v-else class="bracket-guidance">
        <HudIcon name="brackets" :size="28" class="guidance-icon" />
        <h3 class="guidance-title">{{ $t('tournament.noBracketData') }}</h3>
        <p class="guidance-text">{{ $t('tournament.bracketGuidance') }}</p>
        <button v-if="isAdmin" class="guidance-btn" @click="router.push('/menu/admin')">
          {{ $t('tournament.goToAdmin') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 1200px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0;
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.back-link {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
}

.card-body {
  padding: var(--space-6);
}

.picker-intro {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: var(--hud-border) solid var(--border-subtle);
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-3) var(--space-2);
  background: transparent;
  border: none;
  border-bottom: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-default);
}

.picker-item:hover {
  background: var(--bg-selected);
}

.picker-item:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.picker-name {
  font-family: var(--font-display);
  font-size: var(--t-body);
  font-weight: var(--font-thin);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-shrink: 0;
}

.picker-count {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-heavy);
  color: var(--text-secondary);
}

.picker-status {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.picker-status.status-ongoing {
  color: var(--live);
}

.bracket-guidance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  text-align: center;
}

.guidance-icon {
  color: var(--text-tertiary);
}

.bracket-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
}

.guidance-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
}

.guidance-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  max-width: 400px;
  line-height: 1.5;
}

.guidance-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-default);
}

.guidance-btn:hover {
  background: var(--bg-selected);
}

@media (max-width: 480px) {
  .card-header,
  .card-body {
    padding: var(--space-4);
  }
}
</style>
