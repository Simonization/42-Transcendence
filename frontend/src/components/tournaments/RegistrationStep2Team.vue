<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useFriendsStore } from '../../stores/friends'
import type { FormData } from '../../composables/useRegistrationForm'

interface Props {
  formData: FormData
  errors: Record<string, string>
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:formData': [data: FormData]
}>()

// API Integration for friends
const authStore = useAuthStore()
const friendsStore = useFriendsStore()

const { user } = authStore
const { acceptedFriends, isLoading, fetchFriends } = friendsStore
const searchQuery = ref('')

// Fetch friends when component opens
watch(() => props.isOpen, (open) => {
  if (open && user.value) {
    fetchFriends(user.value.id)
  }
})

// Helper to get initials
const getInitials = (username: string, displayName?: string | null): string => {
  const name = displayName ?? username
  return name.slice(0, 2).toUpperCase()
}

// Filter friends by search query
const filteredFriends = computed(() => {
  if (!searchQuery.value) return acceptedFriends.value

  const query = searchQuery.value.toLowerCase()
  return acceptedFriends.value.filter(
    friend =>
      friend.username.toLowerCase().includes(query) ||
      friend.profile.displayName?.toLowerCase().includes(query)
  )
})

const updateField = (field: keyof FormData, value: any) => {
  emit('update:formData', { ...props.formData, [field]: value })
}

const isSelected = (friendId: number): boolean => {
  return props.formData.teamMembers.includes(friendId.toString())
}

const toggleTeamMember = (memberId: string) => {
  const idx = props.formData.teamMembers.indexOf(memberId)
  let newMembers: string[]

  if (idx > -1) {
    newMembers = props.formData.teamMembers.filter((_, i) => i !== idx)
  } else if (props.formData.teamMembers.length < 4) {
    newMembers = [...props.formData.teamMembers, memberId]
  } else {
    return
  }

  emit('update:formData', { ...props.formData, teamMembers: newMembers })
}
</script>

<template>
  <section class="step-pane">
    <h3 class="step-title">Step 2 of 3: Team Details</h3>

    <div class="form-group">
      <label for="team-name" class="form-label">Team Name *</label>
      <input
        id="team-name"
        :value="formData.teamName"
        type="text"
        class="form-input"
        placeholder="Your team name"
        required
        aria-required="true"
        :aria-invalid="!!errors.teamName"
        :aria-describedby="errors.teamName ? 'team-name-error' : undefined"
        @input="updateField('teamName', $event.target.value)"
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
      <div v-if="isLoading" class="member-loading">
        <span class="loading-spinner">⏳</span>
        <p>Loading friends...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="acceptedFriends.length === 0" class="member-empty">
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

fieldset {
  border: none;
  padding: 0;
  margin: 0;
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

.search-icon {
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
  -webkit-clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
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

.error-message {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-error);
  padding: var(--space-2) var(--space-3);
  background: var(--color-error-bg);
  border-left: 2px solid var(--color-error);
}
</style>
