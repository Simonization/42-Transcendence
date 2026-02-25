<script setup lang="ts">
/**
 * Tournament Detail Page
 * Shows tournament overview, bracket, participants, and chat with tab navigation
 */

import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '../../stores/notifications'
import TournamentRegistrationModal from '../../components/tournaments/TournamentRegistrationModal.vue'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import { useTournaments } from '../../composables/useTournaments'
import { toDisplayTournament } from '../../utils/tournamentMapper'
import type { TournamentBracket, BracketRound } from '../../data/mockBracket'

type TabType = 'overview' | 'bracket' | 'participants' | 'chat'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notificationsStore = useNotificationsStore()
const { success: showSuccess, error: showError } = notificationsStore
const activeTab = ref<TabType>('overview')
const registrationModalOpen = ref(false)

const { currentTournament, isLoading, error, fetchTournament, register } = useTournaments()

const tournamentId = computed(() => Number(route.params.id))

onMounted(() => {
  if (tournamentId.value) fetchTournament(tournamentId.value)
})

watch(tournamentId, (id) => {
  if (id) fetchTournament(id)
})

// Map backend tournament to display format for template compatibility
const tournament = computed(() => {
  if (!currentTournament.value) return null
  return toDisplayTournament(currentTournament.value)
})

// Build bracket from phases/matches if available
const bracketData = computed((): TournamentBracket | null => {
  const bt = currentTournament.value
  if (!bt?.phases?.length) return null

  // Build team name lookup from tournament teams
  const teamNameMap = new Map<number, string>()
  for (const team of bt.teams ?? []) {
    teamNameMap.set(team.id, team.name)
  }

  const rounds: BracketRound[] = []
  for (const phase of bt.phases) {
    if (!phase.matches?.length) continue
    // Group matches by round
    const roundMap = new Map<number, typeof phase.matches>()
    for (const m of phase.matches) {
      const arr = roundMap.get(m.round) ?? []
      arr.push(m)
      roundMap.set(m.round, arr)
    }
    for (const [roundNum, matches] of roundMap) {
      rounds.push({
        label: `ROUND ${roundNum}`,
        matches: matches.map((m, idx) => ({
          id: String(m.id),
          roundIndex: roundNum - 1,
          matchIndex: idx,
          player1: m.team1_id ? { id: String(m.team1_id), username: teamNameMap.get(m.team1_id) ?? `Team ${m.team1_id}`, avatar: '👤', rating: 0, seed: 0 } : null,
          player2: m.team2_id ? { id: String(m.team2_id), username: teamNameMap.get(m.team2_id) ?? `Team ${m.team2_id}`, avatar: '👤', rating: 0, seed: 0 } : null,
          score1: m.team1_score,
          score2: m.team2_score,
          status: m.status === 'completed' ? 'completed' as const : m.status === 'live' ? 'live' as const : 'upcoming' as const,
          winnerId: m.winner_id ? String(m.winner_id) : null,
          scheduledAt: m.scheduledAt ?? '',
          completedAt: m.completedAt,
        })),
      })
    }
  }

  return {
    tournamentId: String(bt.id),
    bracketType: bt.phases[0]?.type === 'DOUBLE_ELIMINATION' ? 'double-elimination' : bt.phases[0]?.type === 'ROUND_ROBIN' ? 'round-robin' : 'single-elimination',
    rounds,
    champion: null,
  }
})

// Teams for participants tab (show teams, not flat members)
const teamsList = computed(() => {
  const bt = currentTournament.value
  if (!bt?.teams?.length) return []
  return bt.teams
})

// Total participant count across all teams
const totalParticipants = computed(() =>
  teamsList.value.reduce((sum, team) => sum + (team.members?.length ?? 0), 0)
)

// Required team size from game
const requiredTeamSize = computed(() => gameInfo.value.teamSize)

const searchParticipant = ref('')

const filteredTeams = computed(() => {
  if (!searchParticipant.value) return teamsList.value
  const q = searchParticipant.value.toLowerCase()
  return teamsList.value.filter(team =>
    team.name.toLowerCase().includes(q) ||
    team.members.some(m => m.username.toLowerCase().includes(q))
  )
})

const isRegistered = ref(false)

const handleRegister = () => {
  registrationModalOpen.value = true
}

const handleRegistered = () => {
  isRegistered.value = true
  registrationModalOpen.value = false
  // Refresh to get updated teams list
  fetchTournament(tournamentId.value)
}

/** Get game info from the first phase */
const gameInfo = computed(() => {
  const bt = currentTournament.value
  if (!bt?.phases?.[0]?.game) return { teamSize: 1, gameName: 'Pong' }
  const game = bt.phases[0].game
  return {
    teamSize: game.teamSize ?? 1,
    gameName: game.name ?? 'Unknown',
  }
})

const tabs = computed<Array<{ id: TabType; label: string; icon: string }>>(() => [
  { id: 'overview', label: t('tournament.overview'), icon: '📋' },
  { id: 'bracket', label: t('tournament.bracket'), icon: '🏆' },
  { id: 'participants', label: t('tournament.participants'), icon: '👥' },
  { id: 'chat', label: t('tournament.chat'), icon: '💬' },
])
</script>

<template>
  <div v-if="tournament" class="tournament-detail">
    <!-- Sticky Header -->
    <header class="detail-header glass-header">
      <div class="detail-header-content">
        <h1 class="detail-title">{{ tournament.name }}</h1>
        <div class="detail-meta">
          <span class="detail-game">{{ tournament.game }}</span>
          <span class="detail-organizer">{{ tournament.organizer.name }}</span>
        </div>
      </div>
      <button
        class="detail-cta-btn"
        :aria-label="`${isRegistered ? 'Already registered for' : 'Register for'} ${tournament.name}`"
        @click="handleRegister"
      >
        {{ isRegistered ? $t('tournament.youreRegistered') : $t('tournament.registerNow') }}
      </button>
    </header>

    <!-- Tab Navigation -->
    <nav class="detail-tabs glass-panel" role="tablist" aria-label="Tournament information tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="`tab-${tab.id}`"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        class="tab-btn"
        :class="{ 'tab-btn-active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Tab Content -->
    <main class="detail-content">
      <!-- Overview Tab -->
      <section
        v-show="activeTab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
        class="tab-pane glass-panel"
      >
        <div class="overview-grid">
          <!-- Tournament Info -->
          <div class="overview-section">
            <h3 class="section-title">{{ $t('tournament.tournamentInfo') }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ $t('tournament.format') }}</span>
                <span class="info-value">{{ tournament.format }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('tournament.date') }}</span>
                <span class="info-value">{{ tournament.date }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('tournament.endDate') }}</span>
                <span class="info-value">{{ tournament.endDate }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('tournament.maxPlayers') }}</span>
                <span class="info-value">{{ tournament.maxParticipants }}</span>
              </div>
            </div>
          </div>

          <!-- Prize Pool -->
          <div class="overview-section">
            <h3 class="section-title">{{ $t('tournament.prizePool') }}</h3>
            <div class="prize-display">
              <span class="prize-value">{{ tournament.prize }}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="overview-section overview-section-full">
            <h3 class="section-title">{{ $t('tournament.description') }}</h3>
            <p class="description-text">{{ tournament.description }}</p>
          </div>

          <!-- Rules -->
          <div class="overview-section overview-section-full">
            <h3 class="section-title">{{ $t('tournament.rules') }}</h3>
            <pre class="rules-text">{{ tournament.rules }}</pre>
          </div>

          <!-- Participants Progress -->
          <div class="overview-section overview-section-full">
            <h3 class="section-title">{{ $t('tournament.registrationStatus') }}</h3>
            <div class="progress-container">
              <div class="progress-info">
                <span class="progress-label">{{ $t('tournament.registered') }}</span>
                <span class="progress-value">
                  {{ tournament.currentParticipants }}/{{ tournament.maxParticipants }}
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${(tournament.currentParticipants / tournament.maxParticipants) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Bracket Tab -->
      <section
        v-show="activeTab === 'bracket'"
        id="panel-bracket"
        role="tabpanel"
        aria-labelledby="tab-bracket"
        class="tab-pane"
      >
        <BracketVisualization
          v-if="bracketData"
          :bracket="bracketData"
          :tournament-name="tournament?.name"
        />
      </section>

      <!-- Participants Tab -->
      <section
        v-show="activeTab === 'participants'"
        id="panel-participants"
        role="tabpanel"
        aria-labelledby="tab-participants"
        class="tab-pane glass-panel"
      >
        <div class="participants-container">
          <!-- Search Bar -->
          <div class="participants-search">
            <label for="participant-search" class="visually-hidden">Search participants</label>
            <input
              id="participant-search"
              v-model="searchParticipant"
              type="text"
              class="search-input"
              :placeholder="$t('tournament.searchParticipants')"
            />
            <span class="search-icon" aria-hidden="true">🔍</span>
          </div>

          <!-- Teams List -->
          <div class="participants-list">
            <div
              v-for="team in filteredTeams"
              :key="team.id"
              class="team-card"
            >
              <div class="team-header">
                <span class="team-name">{{ team.name }}</span>
                <span
                  class="team-status-badge"
                  :class="`status-${team.status.toLowerCase()}`"
                >
                  {{ team.status }}
                </span>
              </div>
              <div class="team-members">
                <div
                  v-for="member in team.members"
                  :key="member.id"
                  class="participant-item"
                >
                  <span class="participant-avatar">
                    <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.username" class="avatar-img" />
                    <span v-else>👤</span>
                  </span>
                  <div class="participant-info">
                    <span class="participant-name">
                      @{{ member.username }}
                      <span v-if="member.id === team.captain_id" class="captain-badge">{{ $t('teams.captain') }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="team-member-count">
                {{ team.members?.length ?? 0 }}/{{ requiredTeamSize }} {{ $t('teams.players') }}
              </div>
            </div>

            <div v-if="filteredTeams.length === 0" class="no-participants">
              <span class="no-participants-icon">🔍</span>
              <p class="no-participants-text">{{ $t('tournament.noParticipants') }}</p>
            </div>
          </div>

          <div class="participants-summary">
            <span class="summary-label">{{ $t('tournament.totalRegistered') }}</span>
            <span class="summary-value">{{ teamsList.length }} {{ $t('teams.teams') }} ({{ totalParticipants }} {{ $t('teams.players') }})</span>
          </div>
        </div>
      </section>

      <!-- Chat Tab -->
      <section
        v-show="activeTab === 'chat'"
        id="panel-chat"
        role="tabpanel"
        aria-labelledby="tab-chat"
        class="tab-pane glass-panel"
      >
        <div class="chat-placeholder">
          <div class="chat-icon">💬</div>
          <h3 class="chat-title">{{ $t('tournament.tournamentChat') }}</h3>
          <p class="chat-text">{{ $t('tournament.chatDescription') }}</p>
          <p class="chat-subtext">{{ $t('tournament.chatComingSoon') }}</p>
          <p class="chat-subtext">{{ $t('tournament.chatWebSocket') }}</p>
        </div>
      </section>
    </main>
  </div>

  <div v-else-if="isLoading" class="tournament-not-found glass-panel">
    <div class="not-found-icon">⏳</div>
    <h2 class="not-found-title">{{ $t('common.loading') }}</h2>
  </div>

  <div v-else class="tournament-not-found glass-panel">
    <div class="not-found-icon">❌</div>
    <h2 class="not-found-title">{{ error || $t('tournament.notFound') }}</h2>
  </div>

  <!-- Registration Modal -->
  <TournamentRegistrationModal
    v-if="tournament && currentTournament"
    :tournament-id="currentTournament.id"
    :tournament-name="tournament.name"
    :rules="tournament.rules"
    :is-open="registrationModalOpen"
    :team-size="gameInfo.teamSize"
    :game-name="gameInfo.gameName"
    @close="registrationModalOpen = false"
    @registered="handleRegistered"
  />
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

.tournament-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Header */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.detail-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.detail-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.detail-game {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.detail-organizer {
  color: var(--text-secondary);
}

.detail-cta-btn {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.detail-cta-btn:hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.detail-cta-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Tabs */
.detail-tabs {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.detail-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.tab-btn-active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: var(--bg-selected);
}

.tab-icon {
  font-size: var(--text-lg);
}

/* Content */
.detail-content {
  display: flex;
  flex-direction: column;
}

.tab-pane {
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: fade-in 200ms ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Overview Tab */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}

.overview-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.overview-section-full {
  grid-column: 1 / -1;
}

.section-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.info-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.info-value {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.prize-display {
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--accent-primary-glow), var(--accent-secondary-glow));
  border: var(--hud-border) solid var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.prize-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.description-text,
.rules-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  font-family: var(--font-sans);
}

.rules-text {
  font-family: var(--font-mono);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.progress-value {
  font-family: var(--font-display);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width var(--duration-normal) var(--ease-default);
}


/* Participants Tab */
.participants-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.participants-search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

.search-icon {
  position: absolute;
  right: var(--space-4);
  pointer-events: none;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 400px;
  overflow-y: auto;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-default);
}

.participant-item:hover {
  background: var(--bg-selected);
  border-color: var(--accent-primary-subtle);
}

.participant-avatar {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.team-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.team-name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wider);
}

.team-status-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: var(--space-1) var(--space-2);
  text-transform: uppercase;
}

.status-locked {
  background: var(--color-success);
  color: white;
}

.status-draft {
  background: var(--color-warning);
  color: white;
}

.status-archived {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.team-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-2);
}

.team-member-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.captain-badge {
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  margin-left: var(--space-1);
  letter-spacing: var(--tracking-wider);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-participants {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.no-participants-icon {
  font-size: var(--text-4xl);
  margin-bottom: var(--space-2);
}

.no-participants-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.participants-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  font-size: var(--text-sm);
}

.summary-label {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.summary-value {
  font-family: var(--font-display);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

/* Chat Tab */
.chat-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
}

.chat-icon {
  font-size: var(--text-6xl);
  margin-bottom: var(--space-4);
}

.chat-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.chat-text {
  margin: var(--space-4) 0 var(--space-2) 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.chat-subtext {
  margin: var(--space-1) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

/* Not Found */
.tournament-not-found {
  padding: var(--space-12);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
}

.not-found-icon {
  font-size: var(--text-6xl);
}

.not-found-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .detail-cta-btn {
    width: 100%;
  }

  .detail-tabs {
    overflow-x: auto;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .detail-title {
    font-size: var(--text-lg);
  }
}

@media (max-width: 480px) {
  .tab-pane {
    padding: var(--space-4);
  }

  .section-title {
    font-size: var(--text-xs);
  }

  .prize-value {
    font-size: var(--text-2xl);
  }

  .detail-meta {
    flex-direction: column;
    gap: var(--space-2);
  }
}
</style>
