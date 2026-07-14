<script setup lang="ts">
/**
 * TeamSetupCard — Create and manage your team for a tournament
 * Route: /menu/tournaments/:id/team
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'
import { tournamentsApi } from '../../api/tournaments'
import { teamsApi } from '../../api/teams'
import { usersApi } from '../../api/users'
import type { BackendTournament, BackendTeam, TeamInvitation } from '../../types'
import { TeamStatus } from '../../types'
import type { User } from '../../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const notifications = useNotificationsStore()

const tournamentId = computed(() => Number(route.params.id))
const me = computed(() => authStore.user)

// ─── State ───────────────────────────────────────────────────────────────────

const tournament = ref<BackendTournament | null>(null)
const myTeam = ref<BackendTeam | null>(null)
const myInvitation = ref<TeamInvitation | null>(null)
const pendingInvitations = ref<TeamInvitation[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)

// Create team form
const teamName = ref('')

// Invite panel
const showInvitePanel = ref(false)
const searchQuery = ref('')
const searchResults = ref<User[]>([])
const isSearching = ref(false)
const invitingUserId = ref<number | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

const requiredSize = computed(() => {
  const phase1 = tournament.value?.phases?.find(p => p.order === 1)
  return phase1?.game?.teamSize ?? 1
})

const isCaptain = computed(() =>
  myTeam.value !== null && myTeam.value.captain_id === me.value?.id
)

const isLocked = computed(() =>
  myTeam.value?.status === TeamStatus.LOCKED
)

const memberCount = computed(() => myTeam.value?.members?.length ?? 0)

const pendingCount = computed(() => pendingInvitations.value.length)

const canLock = computed(() =>
  isCaptain.value &&
  !isLocked.value &&
  memberCount.value === requiredSize.value
)

// All slots: filled members + pending invites + empty
const slots = computed(() => {
  const result: Array<
    | { kind: 'member'; user: BackendTeam['members'][0] }
    | { kind: 'pending'; invitation: TeamInvitation }
    | { kind: 'empty' }
  > = []

  // Filled members
  for (const m of myTeam.value?.members ?? []) {
    result.push({ kind: 'member', user: m })
  }

  // Pending invitations
  for (const inv of pendingInvitations.value) {
    if (result.length < requiredSize.value) {
      result.push({ kind: 'pending', invitation: inv })
    }
  }

  // Empty slots
  while (result.length < requiredSize.value) {
    result.push({ kind: 'empty' })
  }

  return result
})

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  isLoading.value = true
  try {
    const [tournamentData, statusData] = await Promise.all([
      tournamentsApi.getById(tournamentId.value),
      teamsApi.getMyTeam(tournamentId.value),
    ])
    tournament.value = tournamentData
    myTeam.value = statusData.team
    myInvitation.value = statusData.invitation

    if (myTeam.value && isCaptain.value) {
      pendingInvitations.value = await teamsApi.getTeamInvitations(myTeam.value.id)
    }
  } catch {
    notifications.error('Failed to load tournament data')
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ─── Create team ─────────────────────────────────────────────────────────────

async function createTeam() {
  if (teamName.value.trim().length < 3) return
  isSubmitting.value = true
  try {
    myTeam.value = await teamsApi.create({
      name: teamName.value.trim(),
      tournament_id: tournamentId.value,
    })
    teamName.value = ''
    notifications.success('Team created!')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to create team')
  } finally {
    isSubmitting.value = false
  }
}

// ─── Invite ───────────────────────────────────────────────────────────────────

watch(searchQuery, async (q) => {
  if (!q.trim()) { searchResults.value = []; return }
  isSearching.value = true
  try {
    const all = await usersApi.search(q, 10)
    // Exclude already members and current pending
    const memberIds = new Set(myTeam.value?.members.map(m => m.id) ?? [])
    const pendingIds = new Set(pendingInvitations.value.map(i => i.receiver_id))
    searchResults.value = all.filter(u => !memberIds.has(u.id) && !pendingIds.has(u.id) && u.id !== me.value?.id)
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
})

async function inviteUser(userId: number) {
  if (!myTeam.value) return
  invitingUserId.value = userId
  try {
    const inv = await teamsApi.invitePlayer(myTeam.value.id, { userId })
    pendingInvitations.value.push(inv)
    searchResults.value = searchResults.value.filter(u => u.id !== userId)
    notifications.success('Invitation sent!')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to send invite')
  } finally {
    invitingUserId.value = null
  }
}

// ─── Lock ─────────────────────────────────────────────────────────────────────

async function lockTeam() {
  if (!myTeam.value || !canLock.value) return
  isSubmitting.value = true
  try {
    myTeam.value = await teamsApi.lock(myTeam.value.id)
    notifications.success('Team locked! You are registered.')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to lock team')
  } finally {
    isSubmitting.value = false
  }
}

// ─── Invitation accept/decline (invited user) ─────────────────────────────────

async function acceptInvitation() {
  if (!myInvitation.value) return
  isSubmitting.value = true
  try {
    await teamsApi.acceptInvitation(myInvitation.value.id)
    await load()
    notifications.success('Joined team!')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to accept invitation')
  } finally {
    isSubmitting.value = false
  }
}

async function declineInvitation() {
  if (!myInvitation.value) return
  isSubmitting.value = true
  try {
    await teamsApi.declineInvitation(myInvitation.value.id)
    myInvitation.value = null
    notifications.info('Invitation declined.')
  } catch {
    notifications.error('Failed to decline invitation')
  } finally {
    isSubmitting.value = false
  }
}

// ─── Delete / Leave team ───────────────────────────────────────────────────────

async function deleteTeam() {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.deleteTeam(myTeam.value.id)
    myTeam.value = null
    pendingInvitations.value = []
    notifications.success('Team deleted.')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to delete team')
  } finally {
    isSubmitting.value = false
  }
}

async function leaveTeam() {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.leaveTeam(myTeam.value.id)
    myTeam.value = null
    notifications.success('Left team.')
  } catch (err: any) {
    notifications.error(err?.message ?? 'Failed to leave team')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="team-setup">
    <!-- Header -->
    <div class="team-setup-header">
      <button class="back-btn" @click="router.push(`/menu/tournaments`)">← Back</button>
      <div>
        <h2 class="team-setup-title">{{ tournament?.name ?? '...' }}</h2>
        <span class="team-setup-sub">{{ t('tournament.teamSetup') }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="ts-loading">{{ t('common.loadingDots') }}</div>

    <template v-else>

      <!-- ── PENDING INVITATION (shown even if already in a team) ── -->
      <div v-if="myInvitation" class="ts-invitation-card glass-panel">
        <div class="ts-inv-icon">📨</div>
        <h3 class="ts-inv-title">{{ t('tournament.invitationReceived') }}</h3>
        <p class="ts-inv-body">
          <strong>{{ myInvitation.sender?.username ?? 'Someone' }}</strong>
          {{ t('tournament.invitedYouToTeam') }}
          <strong>{{ myInvitation.team?.name }}</strong>
        </p>
        <p v-if="myTeam" class="ts-inv-warning">
          {{ isCaptain ? t('tournament.acceptWillDeleteTeam') : t('tournament.acceptWillLeaveTeam') }}
        </p>
        <div class="ts-inv-actions">
          <button class="ts-btn ts-btn-accent" :disabled="isSubmitting" @click="acceptInvitation">
            {{ t('common.accept') }}
          </button>
          <button class="ts-btn ts-btn-ghost" :disabled="isSubmitting" @click="declineInvitation">
            {{ t('common.decline') }}
          </button>
        </div>
      </div>

      <!-- ── CREATE TEAM ── -->
      <div v-else-if="!myTeam" class="ts-create-card glass-panel">
        <h3 class="ts-section-title">{{ t('tournament.createYourTeam') }}</h3>
        <p class="ts-hint">{{ t('tournament.teamSizeHint', { size: requiredSize }) }}</p>
        <div class="ts-form-row">
          <input
            v-model="teamName"
            type="text"
            class="ts-input"
            :placeholder="t('tournament.teamNamePlaceholder')"
            maxlength="50"
            @keydown.enter="createTeam"
          />
          <button
            class="ts-btn ts-btn-accent"
            :disabled="teamName.trim().length < 3 || isSubmitting"
            @click="createTeam"
          >
            {{ isSubmitting ? '...' : t('tournament.createTeam') }}
          </button>
        </div>
      </div>

      <!-- ── TEAM MANAGEMENT ── -->
      <div v-else class="ts-team-card glass-panel">
        <!-- Team header -->
        <div class="ts-team-header">
          <div>
            <h3 class="ts-team-name">{{ myTeam.name }}</h3>
            <span class="ts-team-status" :class="isLocked ? 'status-locked' : 'status-draft'">
              {{ isLocked ? t('tournament.teamLocked') : t('tournament.teamDraft') }}
            </span>
          </div>
          <div class="ts-team-count">{{ memberCount }} / {{ requiredSize }}</div>
        </div>

        <!-- Slots grid -->
        <div class="ts-slots">
          <div
            v-for="(slot, i) in slots"
            :key="i"
            class="ts-slot"
            :class="{
              'ts-slot-filled': slot.kind === 'member',
              'ts-slot-pending': slot.kind === 'pending',
              'ts-slot-empty': slot.kind === 'empty',
            }"
          >
            <!-- Member slot -->
            <template v-if="slot.kind === 'member'">
              <div class="ts-slot-avatar">
                {{ slot.user.username?.charAt(0).toUpperCase() }}
              </div>
              <div class="ts-slot-info">
                <span class="ts-slot-name">{{ slot.user.username }}</span>
                <span v-if="slot.user.id === myTeam.captain_id" class="ts-slot-tag ts-tag-captain">
                  {{ t('tournament.captain') }}
                </span>
              </div>
            </template>

            <!-- Pending invite slot -->
            <template v-else-if="slot.kind === 'pending'">
              <div class="ts-slot-avatar ts-avatar-pending">?</div>
              <div class="ts-slot-info">
                <span class="ts-slot-name">{{ slot.invitation.receiver?.username ?? 'Invited' }}</span>
                <span class="ts-slot-tag ts-tag-pending">{{ t('tournament.pending') }}</span>
              </div>
            </template>

            <!-- Empty slot -->
            <template v-else>
              <div class="ts-slot-avatar ts-avatar-empty">+</div>
              <div class="ts-slot-info">
                <span class="ts-slot-empty-label">{{ t('tournament.emptySlot') }}</span>
                <button
                  v-if="isCaptain && !isLocked"
                  class="ts-invite-btn"
                  @click="showInvitePanel = true"
                >
                  {{ t('tournament.invite') }}
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Invite panel (captain only) -->
        <div v-if="isCaptain && !isLocked" class="ts-invite-panel">
          <button class="ts-invite-toggle" @click="showInvitePanel = !showInvitePanel">
            {{ showInvitePanel ? '▲' : '▼' }} {{ t('tournament.invitePlayer') }}
          </button>

          <div v-if="showInvitePanel" class="ts-invite-body">
            <input
              v-model="searchQuery"
              type="text"
              class="ts-input"
              :placeholder="t('tournament.searchPlayerPlaceholder')"
              autofocus
            />
            <div v-if="isSearching" class="ts-search-hint">{{ t('common.loading') }}…</div>
            <div v-else-if="searchQuery && searchResults.length === 0" class="ts-search-hint">
              {{ t('tournament.noPlayersFound') }}
            </div>
            <ul v-else class="ts-search-results">
              <li
                v-for="user in searchResults"
                :key="user.id"
                class="ts-search-result"
              >
                <span class="ts-result-name">{{ user.username }}</span>
                <button
                  class="ts-btn ts-btn-sm ts-btn-accent"
                  :disabled="invitingUserId === user.id"
                  @click="inviteUser(user.id)"
                >
                  {{ invitingUserId === user.id ? '…' : t('tournament.invite') }}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Lock button (captain only) -->
        <div v-if="isCaptain" class="ts-lock-row">
          <p v-if="!isLocked && memberCount < requiredSize" class="ts-lock-hint">
            {{ t('tournament.lockHint', { needed: requiredSize - memberCount }) }}
          </p>
          <button
            v-if="!isLocked"
            class="ts-btn ts-btn-lock"
            :disabled="!canLock || isSubmitting"
            @click="lockTeam"
          >
            {{ isSubmitting ? '...' : t('tournament.lockTeam') }}
          </button>
          <div v-else class="ts-locked-badge">
            ✓ {{ t('tournament.registrationComplete') }}
          </div>
        </div>

        <!-- Danger zone: delete (captain) or leave (member) -->
        <div v-if="!isLocked" class="ts-danger-row">
          <button
            v-if="isCaptain"
            class="ts-btn ts-btn-danger"
            :disabled="isSubmitting"
            @click="deleteTeam"
          >
            {{ t('tournament.deleteTeam') }}
          </button>
          <button
            v-else
            class="ts-btn ts-btn-danger"
            :disabled="isSubmitting"
            @click="leaveTeam"
          >
            {{ t('tournament.leaveTeam') }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.team-setup {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-6);
  max-width: 640px;
  margin: 0 auto;
}

.team-setup-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.back-btn {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast) var(--ease-default);
}
.back-btn:hover { color: var(--accent-primary); border-color: var(--accent-primary); }

.team-setup-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.team-setup-sub {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.ts-loading {
  text-align: center;
  padding: var(--space-12);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-widest);
}

/* Cards */
.ts-invitation-card,
.ts-create-card,
.ts-team-card {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--glass-bg-elevated);
  border: var(--hud-border) solid var(--glass-border);
}

/* Invitation */
.ts-inv-icon { font-size: var(--text-4xl); text-align: center; }
.ts-inv-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
  text-align: center;
}
.ts-inv-body {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
  line-height: var(--leading-relaxed);
}
.ts-inv-warning {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-warning);
  text-align: center;
  letter-spacing: var(--tracking-wider);
}

.ts-inv-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.ts-danger-row {
  padding-top: var(--space-3);
  border-top: var(--hud-border) solid var(--border-subtle);
  display: flex;
}

/* Section title */
.ts-section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
}
.ts-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

/* Form row */
.ts-form-row {
  display: flex;
  gap: var(--space-3);
  align-items: stretch;
}

/* Input */
.ts-input {
  flex: 1;
  padding: var(--space-3);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: border-color var(--duration-fast) var(--ease-default);
}
.ts-input::placeholder { color: var(--text-tertiary); }
.ts-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

/* Buttons */
.ts-btn {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  border: var(--hud-border) solid;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast) var(--ease-default);
}
.ts-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ts-btn-accent {
  color: var(--bg-primary);
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}
.ts-btn-accent:not(:disabled):hover { opacity: 0.85; box-shadow: 0 0 12px var(--accent-primary-subtle); }

.ts-btn-ghost {
  color: var(--text-secondary);
  background: transparent;
  border-color: var(--border-subtle);
}
.ts-btn-ghost:not(:disabled):hover { color: var(--text-primary); border-color: var(--text-secondary); }

.ts-btn-lock {
  color: var(--color-success);
  background: transparent;
  border-color: var(--color-success);
  align-self: flex-start;
}
.ts-btn-lock:not(:disabled):hover { background: rgba(34,197,94,0.1); box-shadow: 0 0 12px rgba(34,197,94,0.2); }

.ts-btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.ts-btn-danger {
  color: var(--color-error);
  background: transparent;
  border-color: var(--color-error);
  align-self: flex-start;
}
.ts-btn-danger:not(:disabled):hover { background: rgba(239,68,68,0.1); box-shadow: 0 0 12px rgba(239,68,68,0.2); }

/* Team header */
.ts-team-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: var(--space-4);
  border-bottom: var(--hud-border) solid var(--glass-border);
}
.ts-team-name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--accent-primary);
}
.ts-team-status {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: var(--space-1) var(--space-2);
}
.status-locked { background: rgba(34,197,94,0.15); color: var(--color-success); border: var(--hud-border) solid var(--color-success); }
.status-draft { background: var(--bg-tertiary); color: var(--text-tertiary); border: var(--hud-border) solid var(--border-subtle); }

.ts-team-count {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

/* Slots */
.ts-slots {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ts-slot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--hud-border) solid var(--border-subtle);
  transition: border-color var(--duration-fast);
}
.ts-slot-filled { border-color: var(--accent-primary-subtle); background: var(--bg-selected); }
.ts-slot-pending { border-color: var(--color-warning); opacity: 0.75; }
.ts-slot-empty { border-style: dashed; }

.ts-slot-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  background: var(--accent-primary);
  color: var(--bg-primary);
  flex-shrink: 0;
}
.ts-avatar-pending { background: var(--color-warning); color: var(--bg-primary); }
.ts-avatar-empty { background: var(--bg-tertiary); color: var(--text-tertiary); font-size: var(--text-lg); }

.ts-slot-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}
.ts-slot-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}
.ts-slot-empty-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
.ts-slot-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: 2px var(--space-2);
}
.ts-tag-captain { color: var(--accent-primary); background: var(--bg-selected); border: var(--hud-border) solid var(--accent-primary-subtle); }
.ts-tag-pending { color: var(--color-warning); background: rgba(234,179,8,0.1); border: var(--hud-border) solid var(--color-warning); }

.ts-invite-btn {
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.ts-invite-btn:hover { background: var(--bg-selected); }

/* Invite panel */
.ts-invite-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: var(--hud-border) solid var(--glass-border);
}
.ts-invite-toggle {
  background: transparent;
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color var(--duration-fast);
}
.ts-invite-toggle:hover { color: var(--accent-primary); }

.ts-invite-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ts-search-hint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  padding: var(--space-2);
  letter-spacing: var(--tracking-wider);
}
.ts-search-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 200px;
  overflow-y: auto;
}
.ts-search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}
.ts-result-name {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

/* Lock row */
.ts-lock-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: var(--hud-border) solid var(--glass-border);
}
.ts-lock-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
.ts-locked-badge {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--color-success);
  background: rgba(34,197,94,0.1);
  border: var(--hud-border) solid var(--color-success);
  text-align: center;
}
</style>
