<script setup lang="ts">
/**
 * Tournament Registration Modal
 * Creates a team via the backend Teams API.
 * - Solo games (teamSize=1): auto-creates and locks a team of 1
 * - Team games (teamSize>1): draft team, invite friends, lock when full
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useFriendsStore } from '../../stores/friends'
import { useTeams } from '../../composables/useTeams'
import { useNotificationsStore } from '../../stores/notifications'
import { TeamStatus } from '../../types'

const props = defineProps<{
  tournamentId: number
  tournamentName: string
  rules: string
  isOpen: boolean
  /** Team size required by the game (1 = solo) */
  teamSize: number
  /** Game name for display */
  gameName: string
}>()

const emit = defineEmits<{
  close: []
  registered: []
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const friendsStore = useFriendsStore()
const notifications = useNotificationsStore()
const { myTeam, isLoading, error: teamError, createTeam, invitePlayer, lockTeam } = useTeams()

const isSolo = computed(() => props.teamSize <= 1)

// Form state
type Step = 'team' | 'invite' | 'rules'
const currentStep = ref<Step>(isSolo.value ? 'rules' : 'team')
const teamName = ref('')
const selectedFriends = ref<number[]>([])
const acceptRules = ref(false)
const isSubmitting = ref(false)
const searchQuery = ref('')
const invitedPlayerIds = ref<Set<number>>(new Set())

// Max team members to invite = teamSize - 1 (captain is already on the team)
const maxInvites = computed(() => Math.max(0, props.teamSize - 1))

// Fetch friends when modal opens (for team games)
watch(() => props.isOpen, (open) => {
  if (open) {
    resetForm()
    if (!isSolo.value && authStore.user) {
      friendsStore.fetchFriends()
    }
  }
})

const filteredFriends = computed(() => {
  const accepted = friendsStore.acceptedFriends
  if (!searchQuery.value) return accepted
  const q = searchQuery.value.toLowerCase()
  return accepted.filter(f =>
    f.username.toLowerCase().includes(q) ||
    f.profile.displayName?.toLowerCase().includes(q)
  )
})

const getInitials = (username: string, displayName?: string | null): string => {
  const name = displayName ?? username
  return name.slice(0, 2).toUpperCase()
}

const isSelected = (friendId: number): boolean => selectedFriends.value.includes(friendId)

const toggleFriend = (friendId: number) => {
  const idx = selectedFriends.value.indexOf(friendId)
  if (idx > -1) {
    selectedFriends.value.splice(idx, 1)
  } else if (selectedFriends.value.length < maxInvites.value) {
    selectedFriends.value.push(friendId)
  }
}

const canProceedTeam = computed(() => teamName.value.trim().length >= 3)
const canProceedInvite = computed(() => selectedFriends.value.length > 0)
const canSubmit = computed(() => acceptRules.value)

const handleNext = async () => {
  if (currentStep.value === 'team') {
    currentStep.value = 'invite'
  } else if (currentStep.value === 'invite') {
    currentStep.value = 'rules'
  }
}

const handleBack = () => {
  if (currentStep.value === 'rules' && !isSolo.value) {
    currentStep.value = 'invite'
  } else if (currentStep.value === 'invite') {
    currentStep.value = 'team'
  }
}

/**
 * Submit registration:
 * 1. Create team (POST /teams)
 * 2. For team games: invite selected friends
 * 3. For solo: auto-lock the team
 */
const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true

  try {
    // Step 1: Create team
    const name = isSolo.value
      ? (authStore.user?.username ?? 'Solo') + ' Team'
      : teamName.value.trim()

    const team = await createTeam({
      name,
      tournament_id: props.tournamentId,
    })

    if (!team) {
      notifications.error(teamError.value || t('teams.createFailed'), 4000)
      return
    }

    if (isSolo.value) {
      // Solo: lock immediately
      const locked = await lockTeam(team.id)
      if (!locked) {
        notifications.error(teamError.value || t('teams.lockFailed'), 4000)
        return
      }
      notifications.success(t('tournament.registrationSuccess'), 4000)
      emit('registered')
      emit('close')
    } else {
      // Team: invite selected friends
      for (const friendId of selectedFriends.value) {
        const invite = await invitePlayer(team.id, friendId)
        if (invite) {
          invitedPlayerIds.value.add(friendId)
        }
      }
      notifications.success(t('teams.created'), 4000)
      emit('registered')
      emit('close')
    }
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  currentStep.value = isSolo.value ? 'rules' : 'team'
  teamName.value = ''
  selectedFriends.value = []
  acceptRules.value = false
  isSubmitting.value = false
  searchQuery.value = ''
  invitedPlayerIds.value.clear()
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))

const stepNumber = computed(() => {
  if (isSolo.value) return 1
  if (currentStep.value === 'team') return 1
  if (currentStep.value === 'invite') return 2
  return isSolo.value ? 1 : 3
})

const totalSteps = computed(() => isSolo.value ? 1 : 3)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-container glass-panel" role="dialog" aria-modal="true" :aria-label="$t('registration.title')">
          <!-- Header -->
          <header class="modal-header">
            <div>
              <h2 class="modal-title">{{ $t('registration.title') }}</h2>
              <p class="modal-subtitle">{{ tournamentName }} — {{ gameName }}</p>
            </div>
            <button class="modal-close-btn" @click="emit('close')" :aria-label="$t('common.close')">
              ✕
            </button>
          </header>

          <!-- Progress -->
          <div v-if="!isSolo" class="progress-indicator">
            <div v-for="step in totalSteps" :key="step" class="progress-step">
              <div
                class="progress-dot"
                :class="{ 'progress-dot-active': step === stepNumber, 'progress-dot-complete': step < stepNumber }"
              >
                {{ step < stepNumber ? '✓' : step }}
              </div>
              <span v-if="step < totalSteps" class="progress-line"></span>
            </div>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <!-- Solo info banner -->
            <div v-if="isSolo" class="solo-banner">
              <span class="solo-icon">👤</span>
              <p>{{ $t('teams.soloAutoRegister', { game: gameName }) }}</p>
            </div>

            <!-- Step: Team Name -->
            <section v-if="currentStep === 'team'" class="step-pane">
              <h3 class="step-title">{{ $t('teams.nameYourTeam') }}</h3>
              <div class="form-group">
                <label for="team-name" class="form-label">{{ $t('registration.teamName') }} *</label>
                <input
                  id="team-name"
                  v-model="teamName"
                  type="text"
                  class="form-input"
                  :placeholder="$t('registration.teamNamePlaceholder')"
                  maxlength="32"
                  minlength="3"
                  required
                />
              </div>
              <div class="team-size-info">
                <span class="info-label">{{ $t('teams.requiredSize') }}</span>
                <span class="info-value">{{ teamSize }} {{ $t('teams.players') }}</span>
              </div>
            </section>

            <!-- Step: Invite Friends -->
            <section v-if="currentStep === 'invite'" class="step-pane">
              <h3 class="step-title">{{ $t('teams.inviteFriends') }}</h3>
              <p class="step-description">
                {{ $t('teams.inviteDescription', { count: maxInvites }) }}
              </p>

              <!-- Search -->
              <div class="member-search">
                <input
                  v-model="searchQuery"
                  type="text"
                  class="search-input"
                  :placeholder="$t('registration.searchFriends')"
                />
              </div>

              <!-- Loading -->
              <div v-if="friendsStore.isLoading" class="member-loading">
                <p>{{ $t('registration.loadingFriends') }}</p>
              </div>

              <!-- Empty -->
              <div v-else-if="friendsStore.acceptedFriends.length === 0" class="member-empty">
                <p class="empty-text">{{ $t('registration.noFriends') }}</p>
                <p class="empty-subtext">{{ $t('registration.noFriendsHint') }}</p>
              </div>

              <!-- No search results -->
              <div v-else-if="filteredFriends.length === 0 && searchQuery" class="member-empty">
                <p>{{ $t('registration.noResults', { query: searchQuery }) }}</p>
              </div>

              <!-- Friends grid -->
              <div v-else class="members-grid">
                <label
                  v-for="friend in filteredFriends"
                  :key="friend.id"
                  class="member-card"
                  :class="{ 'member-card-selected': isSelected(friend.id) }"
                >
                  <input
                    type="checkbox"
                    class="visually-hidden"
                    :checked="isSelected(friend.id)"
                    @change="toggleFriend(friend.id)"
                    :disabled="selectedFriends.length >= maxInvites && !isSelected(friend.id)"
                  />
                  <div class="member-avatar">
                    <img v-if="friend.profile.avatarUrl" :src="friend.profile.avatarUrl" :alt="friend.username" />
                    <span v-else class="member-initials">{{ getInitials(friend.username, friend.profile.displayName) }}</span>
                  </div>
                  <div class="member-info">
                    <span class="member-name">{{ friend.profile.displayName ?? friend.username }}</span>
                    <span v-if="friend.profile.displayName" class="member-username">@{{ friend.username }}</span>
                  </div>
                  <div class="member-check" aria-hidden="true">
                    <span v-if="isSelected(friend.id)">✓</span>
                  </div>
                </label>
              </div>

              <div class="team-summary">
                <span class="summary-label">{{ $t('registration.selected') }}</span>
                <span class="summary-value">{{ selectedFriends.length }}/{{ maxInvites }}</span>
              </div>
            </section>

            <!-- Step: Rules -->
            <section v-if="currentStep === 'rules'" class="step-pane">
              <h3 v-if="!isSolo" class="step-title">{{ $t('registration.step3Of3') }}</h3>
              <div class="rules-container" role="region" :aria-label="$t('tournament.rules')">
                <pre class="rules-text">{{ rules || $t('teams.noRules') }}</pre>
              </div>
              <label class="checkbox-accept">
                <input v-model="acceptRules" type="checkbox" required />
                <span class="checkbox-text">{{ $t('registration.rulesAcceptRequired') }}</span>
              </label>
            </section>
          </div>

          <!-- Footer -->
          <footer class="modal-footer">
            <button class="modal-btn modal-btn-secondary" @click="emit('close')">
              {{ $t('registration.cancel') }}
            </button>
            <div class="modal-btn-group">
              <button
                v-if="!isSolo && currentStep !== 'team'"
                class="modal-btn modal-btn-secondary"
                @click="handleBack"
              >
                ← {{ $t('registration.backBtn') }}
              </button>

              <!-- Next button (team flow) -->
              <button
                v-if="currentStep === 'team'"
                class="modal-btn modal-btn-primary"
                :disabled="!canProceedTeam"
                @click="handleNext"
              >
                {{ $t('registration.nextBtn') }} →
              </button>
              <button
                v-else-if="currentStep === 'invite'"
                class="modal-btn modal-btn-primary"
                :disabled="!canProceedInvite"
                @click="handleNext"
              >
                {{ $t('registration.nextBtn') }} →
              </button>

              <!-- Submit button -->
              <button
                v-else-if="currentStep === 'rules'"
                class="modal-btn modal-btn-primary"
                :disabled="!canSubmit || isSubmitting"
                @click="handleSubmit"
              >
                {{ isSubmitting ? $t('registration.submitting') : $t('registration.register') }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}

.modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow: 0 0 40px var(--accent-primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.modal-subtitle {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  letter-spacing: var(--tracking-wider);
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: var(--text-lg);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.modal-close-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Progress */
.progress-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.progress-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progress-dot {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  border: var(--hud-border) solid var(--border-default);
  color: var(--text-secondary);
  background: transparent;
}

.progress-dot-active {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  color: var(--accent-primary);
}

.progress-dot-complete {
  border-color: var(--color-success);
  background: var(--color-success);
  color: white;
}

.progress-line {
  width: 30px;
  height: 1px;
  background: var(--border-subtle);
}

/* Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.solo-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.solo-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.step-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.step-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

/* Form */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
  text-transform: uppercase;
}

.form-input {
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.form-input::placeholder { color: var(--text-tertiary); }
.form-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

.team-size-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  font-size: var(--text-sm);
}

.info-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.info-value {
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

/* Member search + grid */
.member-search {
  position: relative;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
}

.search-input::placeholder { color: var(--text-tertiary); }
.search-input:focus-visible { border-color: var(--accent-primary); outline: none; }

.member-loading,
.member-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.empty-text { margin: 0; color: var(--text-secondary); }
.empty-subtext { margin: 0; font-size: var(--text-xs); color: var(--text-tertiary); }

.members-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
  max-height: 250px;
  overflow-y: auto;
  padding: var(--space-2);
  border: var(--hud-border) solid var(--border-subtle);
  background: var(--bg-secondary);
}

@media (min-width: 640px) {
  .members-grid { grid-template-columns: repeat(2, 1fr); }
}

.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.member-card:hover { background: var(--bg-selected); border-color: var(--accent-primary); }

.member-card-selected {
  background: var(--bg-selected);
  border: 2px solid var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.member-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  background: var(--bg-secondary);
  overflow: hidden;
}

.member-avatar img { width: 100%; height: 100%; object-fit: cover; }

.member-initials {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-username {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.member-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  color: var(--accent-primary);
  flex-shrink: 0;
}

.team-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--border-subtle);
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

/* Rules */
.rules-container {
  max-height: 200px;
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.rules-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.checkbox-accept {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  cursor: pointer;
}

.checkbox-accept input { cursor: pointer; accent-color: var(--accent-primary); }

.checkbox-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-6);
  border-top: var(--hud-border) solid var(--glass-border);
  background: var(--bg-tertiary);
  flex-wrap: wrap;
}

.modal-btn-group {
  display: flex;
  gap: var(--space-2);
}

.modal-btn {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}

.modal-btn-primary {
  color: var(--text-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
}

.modal-btn-primary:not(:disabled):hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.modal-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-btn-secondary {
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
}

.modal-btn-secondary:hover { border-color: var(--accent-primary); color: var(--accent-primary); }

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: all 200ms ease-out; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-container { transform: scale(0.95); }
.modal-fade-leave-to .modal-container { transform: scale(0.95); }

/* Responsive */
@media (max-width: 768px) {
  .modal-container { max-width: 95vw; max-height: 95vh; }
  .modal-header, .modal-content { padding: var(--space-4); }
  .modal-footer { flex-direction: column; gap: var(--space-3); }
  .modal-btn-group { width: 100%; flex-direction: column; }
  .modal-btn { width: 100%; }
}
</style>
