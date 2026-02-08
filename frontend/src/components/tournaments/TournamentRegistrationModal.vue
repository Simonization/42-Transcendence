<script setup lang="ts">
/**
 * Tournament Registration Modal - 3-Step Wizard
 * Step 1: Participation type (solo/team)
 * Step 2: Details (conditional based on type)
 * Step 3: Rules acceptance
 */

import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useFriendsStore } from '../../stores/friends'

type Step = 1 | 2 | 3
type ParticipationType = 'solo' | 'team'

interface FormData {
  participationType: ParticipationType | null
  displayName: string
  email: string
  inGameUsername: string
  teamName: string
  teamMembers: string[]
  acceptRules: boolean
}

const props = defineProps<{
  tournamentName: string
  rules: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: FormData]
}>()

const currentStep = ref<Step>(1)
const formData = ref<FormData>({
  participationType: null,
  displayName: 'Player Alpha', // Mock auto-fill
  email: 'player@example.com', // Mock auto-fill
  inGameUsername: '',
  teamName: '',
  teamMembers: [],
  acceptRules: false,
})

const errors = ref<Record<string, string>>({})

// API Integration for friends
const authStore = useAuthStore()
const friendsStore = useFriendsStore()
const searchQuery = ref('')

// Fetch friends when modal opens
watch(() => props.isOpen, (open) => {
  if (open && authStore.user) {
    friendsStore.fetchFriends(authStore.user.id)
  }
})

// Helper to get initials from friend data
const getInitials = (username: string, displayName?: string | null): string => {
  const name = displayName ?? username
  return name.slice(0, 2).toUpperCase()
}

// Check if friend is selected
const isSelected = (friendId: number): boolean => {
  return formData.value.teamMembers.includes(friendId.toString())
}

// Filter friends by search query
const filteredFriends = computed(() => {
  const accepted = friendsStore.acceptedFriends
  if (!searchQuery.value) return accepted

  const query = searchQuery.value.toLowerCase()
  return accepted.filter(
    friend =>
      friend.username.toLowerCase().includes(query) ||
      friend.profile.displayName?.toLowerCase().includes(query)
  )
})

const isSolo = computed(() => formData.value.participationType === 'solo')
const isTeam = computed(() => formData.value.participationType === 'team')

const canProceedStep1 = computed(() => formData.value.participationType !== null)

const canProceedStep2 = computed(() => {
  if (!formData.value.participationType) return false

  if (isSolo.value) {
    return (
      formData.value.displayName.trim() !== '' &&
      formData.value.email.trim() !== '' &&
      formData.value.inGameUsername.trim() !== ''
    )
  }

  if (isTeam.value) {
    return (
      formData.value.teamName.trim() !== '' &&
      formData.value.teamMembers.length >= 1 &&
      formData.value.teamMembers.length <= 4
    )
  }

  return false
})

const canSubmit = computed(() => formData.value.acceptRules)

const validateStep = (step: Step): boolean => {
  errors.value = {}

  if (step === 1) {
    if (!formData.value.participationType) {
      errors.value.type = 'Please select a participation type'
      return false
    }
    return true
  }

  if (step === 2) {
    if (isSolo.value) {
      if (!formData.value.displayName.trim()) {
        errors.value.displayName = 'Display name is required'
      }
      if (!formData.value.email.trim()) {
        errors.value.email = 'Email is required'
      }
      if (!formData.value.inGameUsername.trim()) {
        errors.value.inGameUsername = 'In-game username is required'
      }
    }

    if (isTeam.value) {
      if (!formData.value.teamName.trim()) {
        errors.value.teamName = 'Team name is required'
      }
      if (formData.value.teamMembers.length === 0) {
        errors.value.teamMembers = 'Select at least one teammate'
      }
      if (formData.value.teamMembers.length > 4) {
        errors.value.teamMembers = 'Maximum 4 teammates allowed'
      }
    }

    return Object.keys(errors.value).length === 0
  }

  if (step === 3) {
    if (!formData.value.acceptRules) {
      errors.value.rules = 'You must accept the rules to proceed'
      return false
    }
    return true
  }

  return false
}

const goToStep = (step: Step) => {
  if (step < currentStep.value) {
    currentStep.value = step
  } else if (step > currentStep.value && validateStep(currentStep.value)) {
    currentStep.value = step
  }
}

const handleNext = () => {
  if (validateStep(currentStep.value)) {
    if (currentStep.value < 3) {
      currentStep.value = (currentStep.value + 1) as Step
    }
  }
}

const handleBack = () => {
  if (currentStep.value > 1) {
    currentStep.value = (currentStep.value - 1) as Step
  }
}

const handleSubmit = () => {
  if (validateStep(currentStep.value)) {
    emit('submit', { ...formData.value })
  }
}

const handleCancel = () => {
  emit('close')
}

const toggleTeamMember = (memberId: string) => {
  const idx = formData.value.teamMembers.indexOf(memberId)
  if (idx > -1) {
    formData.value.teamMembers.splice(idx, 1)
  } else if (formData.value.teamMembers.length < 4) {
    formData.value.teamMembers.push(memberId)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-overlay">
        <div class="modal-container glass-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
          <!-- Modal Header -->
          <header class="modal-header">
            <h2 id="modal-title" class="modal-title">TOURNAMENT REGISTRATION</h2>
            <p id="modal-description" class="visually-hidden">Complete this 3-step registration wizard to sign up for the tournament</p>
            <button class="modal-close-btn" @click="handleCancel" aria-label="Close registration modal and return to tournament page">
              ✕
            </button>
          </header>

          <!-- Progress Indicator -->
          <div class="progress-indicator">
            <div v-for="step in [1, 2, 3]" :key="step" class="progress-step">
              <button
                class="progress-dot"
                :class="{ 'progress-dot-active': step === currentStep, 'progress-dot-complete': step < currentStep }"
                @click="goToStep(step as Step)"
              >
                {{ step < currentStep ? '✓' : step }}
              </button>
              <span v-if="step < 3" class="progress-line"></span>
            </div>
          </div>

          <!-- Modal Content -->
          <div class="modal-content">
            <!-- Step 1: Participation Type -->
            <section v-show="currentStep === 1" class="step-pane">
              <fieldset>
                <legend class="step-title">Step 1 of 3: Choose Participation Type</legend>

                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      v-model="formData.participationType"
                      type="radio"
                      name="participation-type"
                      value="solo"
                      aria-describedby="solo-description"
                    />
                    <span class="radio-label">Solo Registration</span>
                    <span id="solo-description" class="radio-description">Register as an individual player</span>
                  </label>

                  <label class="radio-option">
                    <input
                      v-model="formData.participationType"
                      type="radio"
                      name="participation-type"
                      value="team"
                      aria-describedby="team-description"
                    />
                    <span class="radio-label">Team Registration</span>
                    <span id="team-description" class="radio-description">Register as a team (up to 4 players)</span>
                  </label>
                </div>
              </fieldset>

              <div v-if="errors.type" class="error-message">
                {{ errors.type }}
              </div>
            </section>

            <!-- Step 2: Details (Solo) -->
            <section v-show="currentStep === 2 && isSolo" class="step-pane">
              <h3 class="step-title">Step 2 of 3: Confirm Details</h3>

              <div class="form-group">
                <label for="display-name" class="form-label">Display Name *</label>
                <input
                  id="display-name"
                  v-model="formData.displayName"
                  type="text"
                  class="form-input"
                  placeholder="Your display name"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.displayName"
                  :aria-describedby="errors.displayName ? 'display-name-error' : undefined"
                />
                <span v-if="errors.displayName" id="display-name-error" role="alert" class="error-message">
                  {{ errors.displayName }}
                </span>
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email *</label>
                <input
                  id="email"
                  v-model="formData.email"
                  type="email"
                  class="form-input"
                  placeholder="your@email.com"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.email"
                  :aria-describedby="errors.email ? 'email-error' : undefined"
                />
                <span v-if="errors.email" id="email-error" role="alert" class="error-message">
                  {{ errors.email }}
                </span>
              </div>

              <div class="form-group">
                <label for="in-game-username" class="form-label">In-Game Username *</label>
                <input
                  id="in-game-username"
                  v-model="formData.inGameUsername"
                  type="text"
                  class="form-input"
                  placeholder="Your in-game username"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.inGameUsername"
                  :aria-describedby="errors.inGameUsername ? 'in-game-username-error' : undefined"
                />
                <span v-if="errors.inGameUsername" id="in-game-username-error" role="alert" class="error-message">
                  {{ errors.inGameUsername }}
                </span>
              </div>
            </section>

            <!-- Step 2: Details (Team) -->
            <section v-show="currentStep === 2 && isTeam" class="step-pane">
              <h3 class="step-title">Step 2 of 3: Team Details</h3>

              <div class="form-group">
                <label for="team-name" class="form-label">Team Name *</label>
                <input
                  id="team-name"
                  v-model="formData.teamName"
                  type="text"
                  class="form-input"
                  placeholder="Your team name"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.teamName"
                  :aria-describedby="errors.teamName ? 'team-name-error' : undefined"
                />
                <span v-if="errors.teamName" id="team-name-error" role="alert" class="error-message">
                  {{ errors.teamName }}
                </span>
              </div>

              <fieldset class="form-group">
                <legend class="form-label">Select Team Members (1-4) *</legend>

                <!-- Search Input -->
                <div class="member-search">
                  <label for="member-search-input" class="visually-hidden">Search friends</label>
                  <input
                    id="member-search-input"
                    v-model="searchQuery"
                    type="text"
                    class="search-input"
                    placeholder="Search friends..."
                    aria-label="Search team members by username or display name"
                  />
                  <span class="search-icon" aria-hidden="true">🔍</span>
                </div>

                <!-- Loading State -->
                <div v-if="friendsStore.isLoading" class="member-loading">
                  <span class="loading-spinner">⏳</span>
                  <p>Loading friends...</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="friendsStore.acceptedFriends.length === 0" class="member-empty">
                  <span class="empty-icon">👥</span>
                  <p class="empty-text">No friends yet</p>
                  <p class="empty-subtext">Add friends from the Friends page to form a team</p>
                </div>

                <!-- No Search Results -->
                <div v-else-if="filteredFriends.length === 0 && searchQuery" class="member-no-results">
                  <span class="no-results-icon">🔍</span>
                  <p>No friends match "{{ searchQuery }}"</p>
                </div>

                <!-- Member Grid -->
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
                      @change="toggleTeamMember(friend.id.toString())"
                      :disabled="formData.teamMembers.length >= 4 && !isSelected(friend.id)"
                      :aria-label="`Select ${friend.profile.displayName ?? friend.username} as team member`"
                    />

                    <div class="member-avatar">
                      <img v-if="friend.profile.avatarUrl" :src="friend.profile.avatarUrl" :alt="`${friend.username}'s avatar`" />
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

                <span v-if="errors.teamMembers" id="team-members-error" role="alert" class="error-message">
                  {{ errors.teamMembers }}
                </span>
              </fieldset>

              <div class="team-summary">
                <span class="summary-label">Selected:</span>
                <span class="summary-value">{{ formData.teamMembers.length }}/4</span>
              </div>
            </section>

            <!-- Step 3: Rules -->
            <section v-show="currentStep === 3" class="step-pane">
              <h3 class="step-title">Step 3 of 3: Accept Rules</h3>

              <div class="rules-container" role="region" aria-label="Tournament rules">
                <pre class="rules-text">{{ rules }}</pre>
              </div>

              <label class="checkbox-accept">
                <input
                  id="accept-rules"
                  v-model="formData.acceptRules"
                  type="checkbox"
                  required
                  aria-required="true"
                  :aria-invalid="!!errors.rules"
                  :aria-describedby="errors.rules ? 'rules-error' : undefined"
                />
                <span class="checkbox-text">I accept the tournament rules *</span>
              </label>

              <span v-if="errors.rules" id="rules-error" role="alert" class="error-message">
                {{ errors.rules }}
              </span>
            </section>
          </div>

          <!-- Modal Footer -->
          <footer class="modal-footer">
            <button class="modal-btn modal-btn-secondary" @click="handleCancel">
              CANCEL
            </button>

            <div class="modal-btn-group">
              <button
                v-if="currentStep > 1"
                class="modal-btn modal-btn-secondary"
                @click="handleBack"
              >
                ← BACK
              </button>

              <button
                v-if="currentStep < 3"
                class="modal-btn modal-btn-primary"
                :disabled="!canProceedStep2 && currentStep === 2"
                @click="handleNext"
              >
                NEXT →
              </button>

              <button
                v-else
                class="modal-btn modal-btn-primary"
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                REGISTER
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
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

/* Fieldset Reset */
fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

legend {
  padding: 0;
  margin: 0;
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
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    0 0 40px var(--accent-primary-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
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

/* Progress Indicator */
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
  width: 40px;
  height: 40px;
  padding: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-dot:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
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

/* Modal Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
}

.step-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.step-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

/* Radio Group */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.radio-option:hover {
  background: var(--bg-selected);
  border-color: var(--accent-primary-subtle);
}

.radio-option input {
  margin-top: var(--space-1);
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.radio-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.radio-description {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

/* Form Group */
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

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

/* Search Input */
.member-search {
  position: relative;
  margin-bottom: var(--space-4);
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-10) var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: border-color var(--duration-fast) var(--ease-default);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus-visible {
  border-color: var(--accent-primary);
  outline: none;
}

.member-search .search-icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.5;
}

/* Member Grid */
.members-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  max-height: 300px;
  overflow-y: auto;
  padding: var(--space-2);
  border: var(--hud-border) solid var(--border-subtle);
  background: var(--bg-secondary);
}

@media (min-width: 640px) {
  .members-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Member Card */
.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.member-card:hover {
  background: var(--bg-selected);
  border-color: var(--accent-primary);
}

.member-card-selected {
  background: var(--bg-selected);
  border: 2px solid var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.member-card:focus-within {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Avatar */
.member-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  background: var(--bg-secondary);
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-initials {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}

/* Member Info */
.member-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.member-name {
  font-family: var(--font-display);
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
  letter-spacing: var(--tracking-wider);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Check Indicator */
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

/* Loading State */
.member-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
  gap: var(--space-2);
  min-height: 150px;
}

.loading-spinner {
  font-size: var(--text-3xl);
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Empty States */
.member-empty,
.member-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
  gap: var(--space-2);
  min-height: 150px;
}

.empty-icon,
.no-results-icon {
  font-size: var(--text-4xl);
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.empty-subtext {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
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

/* Rules Section */
.rules-container {
  max-height: 300px;
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  margin-bottom: var(--space-4);
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

.checkbox-accept input {
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.checkbox-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

/* Error Message */
.error-message {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-error);
  padding: var(--space-2) var(--space-3);
  background: var(--color-error-bg);
  border-left: 2px solid var(--color-error);
}

/* Modal Footer */
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

.modal-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn-secondary {
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
}

.modal-btn-secondary:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.modal-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 200ms ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container {
  transform: scale(0.95);
}

.modal-fade-leave-to .modal-container {
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    max-width: 95vw;
    max-height: 95vh;
  }

  .modal-header {
    padding: var(--space-4);
  }

  .modal-content {
    padding: var(--space-4);
  }

  .modal-footer {
    flex-direction: column;
    gap: var(--space-3);
  }

  .modal-btn-group {
    width: 100%;
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .progress-indicator {
    gap: 0;
  }

  .progress-line {
    width: 20px;
  }

  .progress-dot {
    width: 36px;
    height: 36px;
    font-size: var(--text-xs);
  }

  .step-title {
    font-size: var(--text-sm);
  }

  .modal-title {
    font-size: var(--text-base);
  }
}
</style>
