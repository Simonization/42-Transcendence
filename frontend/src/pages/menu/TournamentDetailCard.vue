<script setup lang="ts">
/**
 * Tournament Detail Page
 * Shows tournament overview, bracket, participants, and chat with tab navigation
 */

import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '../../stores/notifications'
import { useAuthStore } from '../../stores/auth'
import { teamsApi, type MyTournamentStatus } from '../../api/teams'
import type { LookingForTeamEntry } from '../../types/tournament'
import { TeamStatus } from '../../types'
import TournamentRegistrationModal from '../../components/tournaments/TournamentRegistrationModal.vue'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import TournamentPodium from '../../components/tournaments/TournamentPodium.vue'
import { useTournaments } from '../../composables/useTournaments'
import { toDisplayTournament } from '../../utils/tournamentMapper'
import { buildBracket } from '../../utils/bracket'
import HudIcon from '../../components/hud/HudIcon.vue'
import { useLiveChannel } from '../../composables/useLiveChannel'
import { useUserEvents } from '../../composables/useUserEvents'
import { useCoalescedRefresh } from '../../composables/useCoalescedRefresh'
import { useNow } from '../../composables/useNow'
import RegistrationCountdown from '../../components/tournaments/RegistrationCountdown.vue'
import { isRegistrationOpen, registrationPhase } from '../../utils/registration'
import { RealtimeEvents } from '../../types/realtime'

type TabType = 'overview' | 'bracket' | 'participants' | 'lft' | 'chat'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notificationsStore = useNotificationsStore()
const authStore = useAuthStore()
const { success: showSuccess, error: showError } = notificationsStore
const activeTab = ref<TabType>('overview')
const registrationModalOpen = ref(false)

const { currentTournament, isLoading, error, fetchTournament, register } = useTournaments()

const tournamentId = computed(() => Number(route.params.id))

onMounted(() => {
  if (tournamentId.value) {
    fetchTournament(tournamentId.value)
    loadTeamState()
  }
})

watch(tournamentId, (id) => {
  if (id) {
    fetchTournament(id)
    loadTeamState()
  }
})

// Map backend tournament to display format for template compatibility
const tournament = computed(() => {
  if (!currentTournament.value) return null
  return toDisplayTournament(currentTournament.value)
})

const bracketData = computed(() => buildBracket(currentTournament.value))

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

// ─── My team state, capacity and the looking-for-team board ─────────────────

const me = computed(() => authStore.user)
const myStatus = ref<MyTournamentStatus | null>(null)
const lftEntries = ref<LookingForTeamEntry[]>([])
const lftNote = ref('')
const lftBusy = ref(false)
const invitedUserIds = ref<Set<number>>(new Set())
const requestingTeamId = ref<number | null>(null)

const myTeam = computed(() => myStatus.value?.team ?? null)
const hasTeam = computed(() => myTeam.value !== null)
const isRegistered = computed(() => myTeam.value?.status === TeamStatus.LOCKED)
const availability = computed(() => myStatus.value?.availability ?? null)
// Ticks every second so the deadline flips the page to "closed" without a refetch.
const now = useNow()
const registrationOpen = computed(
  () => !!currentTournament.value && isRegistrationOpen(currentTournament.value, now.value),
)
/** open / closed / ongoing / completed, from the status and the deadline. */
const phase = computed(() =>
  currentTournament.value ? registrationPhase(currentTournament.value, now.value) : 'closed',
)
const tournamentStarted = computed(
  () => phase.value === 'ongoing' || phase.value === 'completed',
)
/** The check-in window is configured, so a per-team badge means something. */
const hasCheckin = computed(() => !!currentTournament.value?.checkin_opens_at)
/** All registration spots are taken and I am not one of the registered teams. */
const isFull = computed(() => !!availability.value?.full && !isRegistered.value)
const iAmFlagged = computed(() => !!myStatus.value?.lookingForTeam)

const canManageTeam = computed(() => {
  const team = myTeam.value
  const uid = me.value?.id
  if (!team || uid == null) return false
  return team.captain_id === uid || (team.admins ?? []).some(a => a.userId === uid)
})

const canInviteFromBoard = computed(
  () => canManageTeam.value && myTeam.value?.status !== TeamStatus.LOCKED && registrationOpen.value,
)

async function loadTeamState() {
  const id = tournamentId.value
  try {
    myStatus.value = await teamsApi.getMyTeam(id)
  } catch {
    myStatus.value = null
  }
  try {
    lftEntries.value = await teamsApi.getLookingForTeam(id)
  } catch {
    lftEntries.value = []
  }
}

// Live: registrations, team list, full state and the looking-for-team board change under us.
const refreshAll = useCoalescedRefresh(async () => {
  const id = tournamentId.value
  if (!id) return
  await Promise.all([fetchTournament(id), loadTeamState()])
})
const refreshMine = useCoalescedRefresh(() => loadTeamState())

useLiveChannel('tournament', tournamentId, {
  [RealtimeEvents.TOURNAMENT_UPDATED]: refreshAll,
}, { onResync: refreshAll })

// My own request/invitation answered, or I was removed from a team.
useUserEvents({
  [RealtimeEvents.INVITATION_RECEIVED]: refreshMine,
})

/** The CTA: bracket once started, else manage my team if I have one, otherwise register (unless full / closed). */
const ctaLabel = computed(() => {
  if (phase.value === 'ongoing') return t('registration.viewBracket')
  if (phase.value === 'completed') return t('registration.viewResults')
  if (isRegistered.value) return t('tournament.youreRegistered')
  if (hasTeam.value) return t('tournament.teamSetup')
  if (isFull.value) return t('teams.tournamentFull')
  if (!registrationOpen.value) return t('teams.registrationClosed')
  return t('tournament.registerNow')
})
const ctaDisabled = computed(
  () => !tournamentStarted.value && !hasTeam.value && (isFull.value || !registrationOpen.value),
)

const handleRegister = () => {
  if (tournamentStarted.value) {
    router.push(`/menu/brackets/${tournamentId.value}`)
    return
  }
  if (hasTeam.value) {
    router.push(`/menu/tournaments/${tournamentId.value}/team`)
    return
  }
  if (ctaDisabled.value) return
  registrationModalOpen.value = true
}

const handleRegistered = () => {
  registrationModalOpen.value = false
  // Refresh to get updated teams list and my team state
  fetchTournament(tournamentId.value)
  loadTeamState()
}

/** A DRAFT team with room, while I have no team of my own. */
const canRequestToJoin = (team: { id: number; status: string; members?: unknown[] }) =>
  !hasTeam.value &&
  registrationOpen.value &&
  team.status === TeamStatus.DRAFT &&
  (team.members?.length ?? 0) < requiredTeamSize.value

const hasPendingRequest = (teamId: number) =>
  (myStatus.value?.requests ?? []).some(r => r.team_id === teamId)

async function requestToJoin(teamId: number) {
  requestingTeamId.value = teamId
  try {
    await teamsApi.requestToJoin(teamId)
    showSuccess(t('teams.requestSent'))
    await loadTeamState()
  } catch (err) {
    showError((err as { message?: string })?.message || t('teams.requestSendFailed'))
  } finally {
    requestingTeamId.value = null
  }
}

async function flagMyself() {
  lftBusy.value = true
  try {
    await teamsApi.flagLookingForTeam(tournamentId.value, lftNote.value.trim() || undefined)
    showSuccess(t('lft.flagged'))
    await loadTeamState()
  } catch (err) {
    showError((err as { message?: string })?.message || t('lft.failed'))
  } finally {
    lftBusy.value = false
  }
}

async function unflagMyself() {
  lftBusy.value = true
  try {
    await teamsApi.unflagLookingForTeam(tournamentId.value)
    lftNote.value = ''
    showSuccess(t('lft.unflagged'))
    await loadTeamState()
  } catch (err) {
    showError((err as { message?: string })?.message || t('lft.failed'))
  } finally {
    lftBusy.value = false
  }
}

async function inviteFromBoard(userId: number) {
  const team = myTeam.value
  if (!team) return
  try {
    await teamsApi.invitePlayer(team.id, { userId })
    invitedUserIds.value = new Set(invitedUserIds.value).add(userId)
    showSuccess(t('lft.invited'))
  } catch (err) {
    showError((err as { message?: string })?.message || t('lft.inviteFailed'))
  }
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
  { id: 'overview', label: t('tournament.overview'), icon: 'clipboard' },
  { id: 'bracket', label: t('tournament.bracket'), icon: 'tournament' },
  { id: 'participants', label: t('tournament.participants'), icon: 'friend' },
  { id: 'lft', label: t('lft.tab'), icon: 'search' },
  { id: 'chat', label: t('tournament.chat'), icon: 'chat' },
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
        <p class="detail-registration" :class="`detail-registration-${phase}`" data-testid="registration-state">
          <template v-if="phase === 'open'">
            <span>{{ $t('registration.open') }}</span>
            <RegistrationCountdown :closes-at="currentTournament?.registration_closes_at" />
          </template>
          <template v-else-if="phase === 'ongoing'">{{ $t('registration.ongoing') }}</template>
          <template v-else-if="phase === 'completed'">{{ $t('registration.completed') }}</template>
          <template v-else>{{ $t('registration.closed') }}</template>
        </p>
      </div>
      <button
        class="detail-cta-btn"
        :class="{ 'detail-cta-btn-disabled': ctaDisabled }"
        :disabled="ctaDisabled"
        :aria-label="`${ctaLabel} — ${tournament.name}`"
        @click="handleRegister"
      >
        {{ ctaLabel }}
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
        <HudIcon :name="tab.icon" :size="14" class="tab-icon" />
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
              <div v-if="currentTournament?.registration_closes_at" class="info-item">
                <span class="info-label">{{ $t('registration.deadline') }}</span>
                <span class="info-value">{{ new Date(currentTournament.registration_closes_at).toLocaleString() }}</span>
              </div>
              <div v-if="currentTournament?.checkin_opens_at" class="info-item">
                <span class="info-label">{{ $t('checkin.opensAt') }}</span>
                <span class="info-value">{{ new Date(currentTournament.checkin_opens_at).toLocaleString() }}</span>
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
              <p
                v-if="availability && availability.spotsLeft !== null"
                class="spots-left"
                :class="{ 'spots-left-full': availability.full }"
              >
                {{ availability.full ? $t('teams.tournamentFull') : $t('teams.spotsLeft', { count: availability.spotsLeft }) }}
              </p>
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
        <TournamentPodium :podium="currentTournament?.podium" link-teams />
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
            <HudIcon name="search" :size="14" class="search-icon" />
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
                <span
                  v-if="hasCheckin && team.status === 'LOCKED'"
                  class="team-status-badge"
                  :class="team.checked_in_at ? 'status-checkedin' : 'status-notcheckedin'"
                  data-testid="checkin-badge"
                >
                  {{ team.checked_in_at ? $t('checkin.checkedIn') : $t('checkin.notCheckedIn') }}
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
                    <HudIcon v-else name="user" :size="18" />
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
              <div v-if="canRequestToJoin(team)" class="team-request-row">
                <span v-if="hasPendingRequest(team.id)" class="team-request-pending">
                  {{ $t('teams.requestPending') }}
                </span>
                <button
                  v-else
                  class="lft-btn lft-btn-sm"
                  :disabled="requestingTeamId === team.id"
                  @click="requestToJoin(team.id)"
                >
                  {{ $t('teams.requestToJoin') }}
                </button>
              </div>
            </div>

            <div v-if="filteredTeams.length === 0" class="no-participants">
              <HudIcon name="friend" :size="28" class="no-participants-icon" />
              <p class="no-participants-text">{{ $t('tournament.noParticipants') }}</p>
            </div>
          </div>

          <div class="participants-summary">
            <span class="summary-label">{{ $t('tournament.totalRegistered') }}</span>
            <span class="summary-value">{{ teamsList.length }} {{ $t('teams.teams') }} ({{ totalParticipants }} {{ $t('teams.players') }})</span>
          </div>
        </div>
      </section>

      <!-- Looking-for-team Tab -->
      <section
        v-show="activeTab === 'lft'"
        id="panel-lft"
        role="tabpanel"
        aria-labelledby="tab-lft"
        class="tab-pane glass-panel"
      >
        <div class="lft-container">
          <div>
            <h3 class="section-title">{{ $t('lft.title') }}</h3>
            <p class="lft-subtitle">{{ $t('lft.subtitle') }}</p>
          </div>

          <!-- Flag / unflag myself -->
          <div v-if="!hasTeam && registrationOpen" class="lft-flag">
            <input
              v-model="lftNote"
              type="text"
              class="search-input"
              maxlength="140"
              :placeholder="$t('lft.notePlaceholder')"
              :aria-label="$t('lft.notePlaceholder')"
              @keydown.enter="flagMyself"
            />
            <div class="lft-flag-actions">
              <button class="lft-btn" :disabled="lftBusy" @click="flagMyself">
                {{ iAmFlagged ? $t('common.save') : $t('lft.flagMe') }}
              </button>
              <button v-if="iAmFlagged" class="lft-btn lft-btn-ghost" :disabled="lftBusy" @click="unflagMyself">
                {{ $t('lft.unflag') }}
              </button>
            </div>
          </div>
          <p v-else-if="hasTeam && !canInviteFromBoard" class="lft-hint">{{ $t('lft.haveTeam') }}</p>
          <p v-else-if="!registrationOpen" class="lft-hint">{{ $t('lft.closed') }}</p>
          <p v-if="!hasTeam && registrationOpen && lftEntries.length" class="lft-hint">
            {{ $t('lft.createTeamFirst') }}
          </p>

          <!-- Board -->
          <ul v-if="lftEntries.length" class="lft-list">
            <li v-for="entry in lftEntries" :key="entry.id" class="lft-item">
              <span class="participant-avatar">
                <img
                  v-if="entry.user?.avatarUrl"
                  :src="entry.user.avatarUrl"
                  :alt="entry.user.username"
                  class="avatar-img"
                />
                <HudIcon v-else name="user" :size="18" />
              </span>
              <div class="lft-item-body">
                <span class="participant-name">
                  @{{ entry.user?.username }}
                  <span v-if="entry.userId === me?.id" class="captain-badge">{{ $t('lft.you') }}</span>
                </span>
                <span v-if="entry.note" class="lft-note">{{ entry.note }}</span>
              </div>
              <button
                v-if="canInviteFromBoard && entry.userId !== me?.id"
                class="lft-btn lft-btn-sm"
                :disabled="invitedUserIds.has(entry.userId)"
                @click="inviteFromBoard(entry.userId)"
              >
                {{ invitedUserIds.has(entry.userId) ? $t('tournament.pending') : $t('lft.invite') }}
              </button>
            </li>
          </ul>
          <div v-else class="no-participants">
            <HudIcon name="friend" :size="28" class="no-participants-icon" />
            <p class="no-participants-text">{{ $t('lft.empty') }}</p>
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
          <HudIcon name="chat" :size="28" class="chat-icon" />
          <h3 class="chat-title">{{ $t('tournament.tournamentChat') }}</h3>
          <p class="chat-text">{{ $t('tournament.chatDescription') }}</p>
          <p class="chat-subtext">{{ $t('tournament.chatComingSoon') }}</p>
          <p class="chat-subtext">{{ $t('tournament.chatWebSocket') }}</p>
        </div>
      </section>
    </main>
  </div>

  <div v-else-if="isLoading" class="tournament-not-found glass-panel">
    <div class="segbar" aria-hidden="true"></div>
    <h2 class="not-found-title">{{ $t('common.loading') }}</h2>
  </div>

  <div v-else class="tournament-not-found glass-panel">
    <HudIcon name="warning" :size="28" class="not-found-icon" />
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
    :is-full="isFull"
    :registration-closes-at="currentTournament.registration_closes_at"
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
  border: var(--hud-border) solid var(--glass-border);
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
  border: var(--hud-border) solid var(--glass-border);
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
  border: var(--hud-border) solid var(--glass-border);
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
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
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

.status-checkedin {
  background: var(--accent-primary);
  color: white;
}

.status-notcheckedin {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.detail-registration {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.detail-registration-open {
  color: var(--color-success);
}

.detail-registration-closed {
  color: var(--color-warning);
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
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
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


/* Capacity + requests */
.spots-left {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.spots-left-full {
  color: var(--color-warning);
  font-weight: var(--font-bold);
}

.detail-cta-btn:disabled,
.detail-cta-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: var(--border-default);
}

.team-request-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.team-request-pending {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-warning);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

/* Looking-for-team board */
.lft-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lft-subtitle,
.lft-hint {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.lft-flag {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lft-flag-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.lft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 400px;
  overflow-y: auto;
}

.lft-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.lft-item-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.lft-note {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.lft-btn {
  padding: var(--space-2) var(--space-4);
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

.lft-btn:not(:disabled):hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
}

.lft-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lft-btn-ghost {
  color: var(--text-secondary);
  border-color: var(--border-default);
}

.lft-btn-sm {
  padding: var(--space-1) var(--space-3);
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
  border: var(--hud-border) solid var(--glass-border);
}

.not-found-icon {
  color: var(--text-tertiary);
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
