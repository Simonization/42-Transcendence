<script setup lang="ts">
/**
 * TeamSetupCard — Create and manage your team for a tournament
 * Route: /menu/tournaments/:id/team
 */

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'
import { tournamentsApi } from '../../api/tournaments'
import { teamsApi } from '../../api/teams'
import { usersApi } from '../../api/users'
import type { BackendTournament, BackendTeam, TeamInvitation } from '../../types'
import { TeamStatus, TournamentStatus } from '../../types'
import type { User } from '../../types'
import type { TournamentAvailability } from '../../types/tournament'
import HudIcon from '../../components/hud/HudIcon.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'

const SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const notifications = useNotificationsStore()

const tournamentId = computed(() => Number(route.params.id))
const me = computed(() => authStore.user)

/** The backend's message when it sent one, otherwise the localized fallback. */
function errorText(err: unknown, fallbackKey: string): string {
  const message = (err as { message?: string } | null)?.message
  return message || t(fallbackKey)
}

// ─── State ───────────────────────────────────────────────────────────────────

const tournament = ref<BackendTournament | null>(null)
const myTeam = ref<BackendTeam | null>(null)
const myInvitation = ref<TeamInvitation | null>(null)
const myRequests = ref<TeamInvitation[]>([])
const availability = ref<TournamentAvailability | null>(null)
const pendingInvitations = ref<TeamInvitation[]>([])
const joinRequests = ref<TeamInvitation[]>([])
const joinCode = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

// Create team form
const teamName = ref('')

// Rename
const isRenaming = ref(false)
const newName = ref('')

// Invite panel
const showInvitePanel = ref(false)
const searchQuery = ref('')
const searchResults = ref<User[]>([])
const isSearching = ref(false)
const invitingUserId = ref<number | null>(null)

// Confirmation dialog (delete team / transfer captaincy / leave a team)
type ConfirmKind = 'delete' | 'transfer' | 'leave'
const confirmState = ref<{ kind: ConfirmKind; userId?: number; name?: string } | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

const requiredSize = computed(() => {
  const phase1 = tournament.value?.phases?.find(p => p.order === 1)
  return phase1?.game?.teamSize ?? 1
})

const isCaptain = computed(() =>
  myTeam.value !== null && myTeam.value.captain_id === me.value?.id
)

/** Promoted members only; the captain holds admin rights through captain_id. */
const adminIds = computed(
  () => new Set(myTeam.value?.admins?.map(a => a.userId) ?? []),
)

const canManage = computed(
  () => isCaptain.value || (me.value != null && adminIds.value.has(me.value.id)),
)

const isAdminOf = (userId: number) =>
  userId === myTeam.value?.captain_id || adminIds.value.has(userId)

const isLocked = computed(() =>
  myTeam.value?.status === TeamStatus.LOCKED
)

const registrationOpen = computed(
  () => tournament.value?.status === TournamentStatus.REGISTRATION_OPEN,
)

const tournamentStarted = computed(
  () =>
    tournament.value?.status === TournamentStatus.ONGOING ||
    tournament.value?.status === TournamentStatus.COMPLETED,
)

const memberCount = computed(() => myTeam.value?.members?.length ?? 0)

/** Every registration spot is taken and my team is not already registered. */
const tournamentFull = computed(() => !!availability.value?.full && !isLocked.value)

const canLock = computed(() =>
  canManage.value &&
  !isLocked.value &&
  registrationOpen.value &&
  !tournamentFull.value &&
  memberCount.value === requiredSize.value
)

const canUnlock = computed(() => canManage.value && isLocked.value && registrationOpen.value)

const canRename = computed(() => canManage.value && !tournamentStarted.value)

/** Members can leave a draft team any time, a locked one only while registration is open. */
const canLeave = computed(
  () => !isCaptain.value && (!isLocked.value || registrationOpen.value),
)

const rosterEditable = computed(() => canManage.value && !isLocked.value)

const inviteLink = computed(() =>
  joinCode.value ? `${window.location.origin}/join/${joinCode.value}` : '',
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

const confirmCopy = computed(() => {
  const c = confirmState.value
  if (!c) return null
  if (c.kind === 'delete') {
    return {
      title: t('teams.confirmDeleteTitle'),
      message: t('teams.confirmDeleteMessage', { name: myTeam.value?.name ?? '' }),
      confirmLabel: t('tournament.deleteTeam'),
      danger: true,
    }
  }
  if (c.kind === 'transfer') {
    return {
      title: t('teams.confirmTransferTitle'),
      message: t('teams.confirmTransferMessage', { name: c.name ?? '' }),
      confirmLabel: t('teams.makeCaptain'),
      danger: false,
    }
  }
  return isLocked.value
    ? {
        title: t('teams.confirmLeaveLockedTitle'),
        message: t('teams.confirmLeaveLockedMessage'),
        confirmLabel: t('tournament.leaveTeam'),
        danger: true,
      }
    : {
        title: t('teams.confirmLeaveTitle'),
        message: t('teams.confirmLeaveMessage', { name: myTeam.value?.name ?? '' }),
        confirmLabel: t('tournament.leaveTeam'),
        danger: true,
      }
})

// ─── Load ─────────────────────────────────────────────────────────────────────

/** `silent` refreshes in place (after an action) without flashing the loading state. */
async function load(silent = false) {
  if (!silent) isLoading.value = true
  try {
    const [tournamentData, statusData] = await Promise.all([
      tournamentsApi.getById(tournamentId.value),
      teamsApi.getMyTeam(tournamentId.value),
    ])
    tournament.value = tournamentData
    myTeam.value = statusData.team
    myInvitation.value = statusData.invitation
    myRequests.value = statusData.requests ?? []
    availability.value = statusData.availability ?? null

    pendingInvitations.value = []
    joinRequests.value = []
    joinCode.value = ''
    if (myTeam.value) {
      const teamId = myTeam.value.id
      const manage = canManage.value
      const [codeRes, invitations, requests] = await Promise.all([
        teamsApi.getJoinCode(teamId).catch(() => null),
        manage ? teamsApi.getTeamInvitations(teamId) : Promise.resolve([] as TeamInvitation[]),
        manage ? teamsApi.getJoinRequests(teamId).catch(() => [] as TeamInvitation[]) : Promise.resolve([] as TeamInvitation[]),
      ])
      joinCode.value = codeRes?.joinCode ?? ''
      pendingInvitations.value = invitations
      joinRequests.value = requests
    }
  } catch {
    notifications.error(t('teams.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => load())

// ─── Create team ─────────────────────────────────────────────────────────────

async function createTeam() {
  if (teamName.value.trim().length < 3) return
  isSubmitting.value = true
  try {
    await teamsApi.create({
      name: teamName.value.trim(),
      tournament_id: tournamentId.value,
    })
    teamName.value = ''
    await load(true)
    notifications.success(t('teams.teamCreated'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.createFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Rename ───────────────────────────────────────────────────────────────────

function startRename() {
  newName.value = myTeam.value?.name ?? ''
  isRenaming.value = true
}

async function saveRename() {
  if (!myTeam.value || newName.value.trim().length < 3) return
  isSubmitting.value = true
  try {
    const updated = await teamsApi.rename(myTeam.value.id, newName.value.trim())
    myTeam.value = { ...myTeam.value, name: updated.name }
    isRenaming.value = false
    notifications.success(t('teams.renamed'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.renameFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Invite ───────────────────────────────────────────────────────────────────

// Debounced, and stale responses are ignored: a slow answer to an earlier keystroke must not
// overwrite the results of a later one.
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchSeq = 0

watch(searchQuery, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchSeq++
  const query = q.trim()
  if (!query) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  const seq = searchSeq
  searchTimer = setTimeout(() => runSearch(query, seq), SEARCH_DEBOUNCE_MS)
})

async function runSearch(query: string, seq: number) {
  try {
    const all = await usersApi.search(query, 10)
    if (seq !== searchSeq) return
    // Exclude already members and current pending
    const memberIds = new Set(myTeam.value?.members.map(m => m.id) ?? [])
    const pendingIds = new Set(pendingInvitations.value.map(i => i.receiver_id))
    searchResults.value = all.filter(u => !memberIds.has(u.id) && !pendingIds.has(u.id) && u.id !== me.value?.id)
  } catch {
    if (seq === searchSeq) searchResults.value = []
  } finally {
    if (seq === searchSeq) isSearching.value = false
  }
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchSeq++
})

async function inviteUser(userId: number) {
  if (!myTeam.value) return
  invitingUserId.value = userId
  try {
    const inv = await teamsApi.invitePlayer(myTeam.value.id, { userId })
    // The invite response has no `receiver` relation; keep the searched user for display.
    const invited = searchResults.value.find(u => u.id === userId)
    pendingInvitations.value.push({
      ...inv,
      receiver: inv.receiver ?? (invited ? { id: invited.id, username: invited.username } : undefined),
    })
    searchResults.value = searchResults.value.filter(u => u.id !== userId)
    notifications.success(t('teams.inviteSent'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.inviteFailed'))
  } finally {
    invitingUserId.value = null
  }
}

async function cancelInvite(invitationId: number) {
  isSubmitting.value = true
  try {
    await teamsApi.cancelInvitation(invitationId)
    pendingInvitations.value = pendingInvitations.value.filter(i => i.id !== invitationId)
    notifications.info(t('teams.inviteCancelled'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.cancelFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Invite link ──────────────────────────────────────────────────────────────

async function copyInviteLink() {
  if (!inviteLink.value) return
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    notifications.success(t('teams.linkCopied'))
  } catch {
    notifications.error(t('teams.copyFailed'))
  }
}

async function regenerateInviteLink() {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    const res = await teamsApi.regenerateJoinCode(myTeam.value.id)
    joinCode.value = res.joinCode
    notifications.success(t('teams.linkRegenerated'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.linkFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Join requests (captain or admin) ─────────────────────────────────────────

async function answerRequest(requestId: number, accept: boolean) {
  isSubmitting.value = true
  try {
    if (accept) await teamsApi.acceptJoinRequest(requestId)
    else await teamsApi.declineJoinRequest(requestId)
    await load(true)
    notifications.success(t(accept ? 'teams.requestAccepted' : 'teams.requestDeclined'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.requestFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function cancelMyRequest(requestId: number) {
  isSubmitting.value = true
  try {
    await teamsApi.cancelInvitation(requestId)
    myRequests.value = myRequests.value.filter(r => r.id !== requestId)
    notifications.info(t('teams.requestCancelled'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.cancelFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Lock / unlock ────────────────────────────────────────────────────────────

async function lockTeam() {
  if (!myTeam.value || !canLock.value) return
  isSubmitting.value = true
  try {
    await teamsApi.lock(myTeam.value.id)
    await load(true)
    notifications.success(t('teams.teamLockedToast'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.lockFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function unlockTeam() {
  if (!myTeam.value || !canUnlock.value) return
  isSubmitting.value = true
  try {
    await teamsApi.unlock(myTeam.value.id)
    await load(true)
    notifications.info(t('teams.unlocked'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.unlockFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Roster management (captain or admin) ─────────────────────────────────────

async function setAdmin(userId: number, makeAdmin: boolean) {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    if (makeAdmin) await teamsApi.promote(myTeam.value.id, userId)
    else await teamsApi.demote(myTeam.value.id, userId)
    await load(true)
    notifications.success(t(makeAdmin ? 'teams.adminGranted' : 'teams.adminRevoked'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.adminChangeFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function kickMember(userId: number) {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.kickPlayer(myTeam.value.id, userId)
    await load(true)
    notifications.info(t('teams.memberRemoved'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.removeFailed'))
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
    await load(true)
    notifications.success(t('teams.inviteAccepted'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.inviteAcceptFailed'))
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
    notifications.info(t('teams.inviteDeclined'))
  } catch {
    notifications.error(t('teams.inviteDeclineFailed'))
  } finally {
    isSubmitting.value = false
  }
}

// ─── Delete / Leave / Transfer (each behind a confirmation) ───────────────────

function askDelete() {
  confirmState.value = { kind: 'delete' }
}

function askTransfer(userId: number, name: string) {
  confirmState.value = { kind: 'transfer', userId, name }
}

function askLeave() {
  confirmState.value = { kind: 'leave' }
}

async function runConfirmed() {
  const c = confirmState.value
  confirmState.value = null
  if (!c) return
  if (c.kind === 'delete') await deleteTeam()
  else if (c.kind === 'transfer' && c.userId != null) await transferCaptain(c.userId)
  else if (c.kind === 'leave') await leaveTeam()
}

async function deleteTeam() {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.deleteTeam(myTeam.value.id)
    notifications.success(t('teams.teamDeleted'))
    await load(true)
  } catch (err) {
    notifications.error(errorText(err, 'teams.deleteFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function transferCaptain(userId: number) {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.transferCaptain(myTeam.value.id, userId)
    await load(true)
    notifications.success(t('teams.transferred'))
  } catch (err) {
    notifications.error(errorText(err, 'teams.transferFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function leaveTeam() {
  if (!myTeam.value) return
  isSubmitting.value = true
  try {
    await teamsApi.leaveTeam(myTeam.value.id)
    notifications.success(t('teams.leftTeam'))
    await load(true)
  } catch (err) {
    notifications.error(errorText(err, 'teams.leaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="team-setup">
    <!-- Header -->
    <div class="team-setup-header">
      <button class="back-btn" @click="router.push(`/menu/tournaments`)">← {{ t('common.back') }}</button>
      <div>
        <h2 class="team-setup-title">{{ tournament?.name ?? '...' }}</h2>
        <span class="team-setup-sub">{{ t('tournament.teamSetup') }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="ts-loading">{{ t('common.loadingDots') }}</div>

    <template v-else>

      <!-- Tournament full / registration state -->
      <div v-if="tournamentFull" class="ts-banner ts-banner-warning" role="status">
        <strong>{{ t('teams.tournamentFull') }}</strong>
        <span>{{ t('teams.tournamentFullHint') }}</span>
      </div>
      <div
        v-else-if="availability && availability.spotsLeft !== null && availability.registrationOpen && !isLocked"
        class="ts-banner"
        role="status"
      >
        {{ t('teams.spotsLeft', { count: availability.spotsLeft }) }}
      </div>

      <!-- ── PENDING INVITATION (shown even if already in a team) ── -->
      <div v-if="myInvitation" class="ts-invitation-card glass-panel">
        <HudIcon name="mail" :size="28" class="ts-inv-icon" />
        <h3 class="ts-inv-title">{{ t('tournament.invitationReceived') }}</h3>
        <p class="ts-inv-body">
          <strong>{{ myInvitation.sender?.username ?? t('teams.someone') }}</strong>
          {{ t('tournament.invitedYouToTeam') }}
          <strong>{{ myInvitation.team?.name }}</strong>
        </p>
        <p v-if="isLocked" class="ts-inv-warning">
          {{ t('teams.lockedCannotJoin') }}
        </p>
        <p v-else-if="myTeam" class="ts-inv-warning">
          {{ isCaptain ? t('tournament.acceptWillDeleteTeam') : t('tournament.acceptWillLeaveTeam') }}
        </p>
        <div class="ts-inv-actions">
          <button class="ts-btn ts-btn-accent" :disabled="isSubmitting || isLocked" @click="acceptInvitation">
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
            maxlength="32"
            @keydown.enter="createTeam"
          />
          <button
            class="ts-btn ts-btn-accent"
            :disabled="teamName.trim().length < 3 || isSubmitting || !registrationOpen"
            @click="createTeam"
          >
            {{ isSubmitting ? '...' : t('tournament.createTeam') }}
          </button>
        </div>
        <p v-if="!registrationOpen" class="ts-hint">{{ t('teams.registrationClosed') }}</p>

        <!-- My pending join requests -->
        <ul v-if="myRequests.length" class="ts-request-list">
          <li v-for="req in myRequests" :key="req.id" class="ts-request">
            <span class="ts-request-name">{{ req.team?.name }}</span>
            <span class="ts-slot-tag ts-tag-pending">{{ t('teams.requestPending') }}</span>
            <button
              class="ts-slot-action"
              :disabled="isSubmitting"
              @click="cancelMyRequest(req.id)"
            >
              {{ t('teams.cancelRequest') }}
            </button>
          </li>
        </ul>
      </div>

      <!-- ── TEAM MANAGEMENT ── -->
      <div v-else class="ts-team-card glass-panel">
        <!-- Team header -->
        <div class="ts-team-header">
          <div class="ts-team-title-block">
            <template v-if="isRenaming">
              <div class="ts-form-row">
                <input
                  v-model="newName"
                  type="text"
                  class="ts-input"
                  :placeholder="t('teams.renamePlaceholder')"
                  maxlength="32"
                  @keydown.enter="saveRename"
                  @keydown.esc="isRenaming = false"
                />
                <button
                  class="ts-btn ts-btn-sm ts-btn-accent"
                  :disabled="newName.trim().length < 3 || isSubmitting"
                  @click="saveRename"
                >
                  {{ t('common.save') }}
                </button>
                <button class="ts-btn ts-btn-sm ts-btn-ghost" @click="isRenaming = false">
                  {{ t('common.cancel') }}
                </button>
              </div>
            </template>
            <template v-else>
              <h3 class="ts-team-name">{{ myTeam.name }}</h3>
              <button
                v-if="canRename"
                class="ts-slot-action"
                :disabled="isSubmitting"
                @click="startRename"
              >
                {{ t('teams.renameTeam') }}
              </button>
            </template>
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
                <span v-else-if="adminIds.has(slot.user.id)" class="ts-slot-tag ts-tag-admin">
                  {{ t('teams.adminTag') }}
                </span>
              </div>

              <div
                v-if="slot.user.id !== myTeam.captain_id && (rosterEditable || isCaptain)"
                class="ts-slot-actions"
              >
                <template v-if="rosterEditable">
                  <button
                    v-if="!adminIds.has(slot.user.id)"
                    class="ts-slot-action"
                    :disabled="isSubmitting"
                    :title="t('teams.grantAdmin')"
                    @click="setAdmin(slot.user.id, true)"
                  >
                    {{ t('teams.plusAdmin') }}
                  </button>
                  <button
                    v-else-if="isCaptain || slot.user.id === me?.id"
                    class="ts-slot-action"
                    :disabled="isSubmitting"
                    :title="t('teams.revokeAdmin')"
                    @click="setAdmin(slot.user.id, false)"
                  >
                    {{ t('teams.minusAdmin') }}
                  </button>
                </template>
                <button
                  v-if="isCaptain"
                  class="ts-slot-action"
                  :disabled="isSubmitting"
                  :title="t('teams.makeCaptainTitle')"
                  @click="askTransfer(slot.user.id, slot.user.username)"
                >
                  {{ t('teams.makeCaptain') }}
                </button>
                <button
                  v-if="rosterEditable && (isCaptain || !isAdminOf(slot.user.id))"
                  class="ts-slot-action ts-slot-action-danger"
                  :disabled="isSubmitting"
                  :title="t('teams.removeFromTeam')"
                  @click="kickMember(slot.user.id)"
                >
                  {{ t('teams.kick') }}
                </button>
              </div>
            </template>

            <!-- Pending invite slot -->
            <template v-else-if="slot.kind === 'pending'">
              <div class="ts-slot-avatar ts-avatar-pending">?</div>
              <div class="ts-slot-info">
                <span class="ts-slot-name">{{ slot.invitation.receiver?.username ?? t('teams.invitedFallback') }}</span>
                <span class="ts-slot-tag ts-tag-pending">{{ t('tournament.pending') }}</span>
              </div>
              <div v-if="canManage" class="ts-slot-actions">
                <button
                  class="ts-slot-action ts-slot-action-danger"
                  :disabled="isSubmitting"
                  :title="t('teams.cancelInviteTitle')"
                  @click="cancelInvite(slot.invitation.id)"
                >
                  {{ t('teams.cancelInvite') }}
                </button>
              </div>
            </template>

            <!-- Empty slot -->
            <template v-else>
              <div class="ts-slot-avatar ts-avatar-empty">+</div>
              <div class="ts-slot-info">
                <span class="ts-slot-empty-label">{{ t('tournament.emptySlot') }}</span>
                <button
                  v-if="canManage && !isLocked"
                  class="ts-invite-btn"
                  @click="showInvitePanel = true"
                >
                  {{ t('tournament.invite') }}
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Invite panel (captain / admin) -->
        <div v-if="canManage && !isLocked" class="ts-invite-panel">
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

        <!-- Invite link (members see it; captain/admins can regenerate) -->
        <div v-if="joinCode && !isLocked" class="ts-link-panel">
          <h4 class="ts-subtitle">{{ t('teams.inviteLinkTitle') }}</h4>
          <p class="ts-hint">{{ t('teams.inviteLinkHint') }}</p>
          <div class="ts-form-row">
            <input class="ts-input ts-link-input" type="text" readonly :value="inviteLink" @focus="($event.target as HTMLInputElement).select()" />
            <button class="ts-btn ts-btn-sm ts-btn-accent" @click="copyInviteLink">
              {{ t('teams.copyLink') }}
            </button>
            <button
              v-if="canManage"
              class="ts-btn ts-btn-sm ts-btn-ghost"
              :disabled="isSubmitting"
              :title="t('teams.regenerateLinkTitle')"
              @click="regenerateInviteLink"
            >
              {{ t('teams.regenerateLink') }}
            </button>
          </div>
        </div>

        <!-- Incoming join requests (captain / admin) -->
        <div v-if="canManage && !isLocked" class="ts-requests-panel">
          <h4 class="ts-subtitle">
            {{ t('teams.joinRequestsTitle') }}
            <span v-if="joinRequests.length" class="ts-count-badge">{{ joinRequests.length }}</span>
          </h4>
          <p v-if="!joinRequests.length" class="ts-hint">{{ t('teams.joinRequestsEmpty') }}</p>
          <ul v-else class="ts-request-list">
            <li v-for="req in joinRequests" :key="req.id" class="ts-request">
              <div class="ts-request-body">
                <span class="ts-request-name">{{ req.sender?.username ?? t('teams.someone') }}</span>
                <span v-if="req.note" class="ts-request-note">{{ req.note }}</span>
              </div>
              <div class="ts-slot-actions">
                <button
                  class="ts-btn ts-btn-sm ts-btn-accent"
                  :disabled="isSubmitting || memberCount >= requiredSize"
                  @click="answerRequest(req.id, true)"
                >
                  {{ t('common.accept') }}
                </button>
                <button
                  class="ts-btn ts-btn-sm ts-btn-ghost"
                  :disabled="isSubmitting"
                  @click="answerRequest(req.id, false)"
                >
                  {{ t('common.decline') }}
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Lock / unlock (captain or admin) -->
        <div v-if="canManage" class="ts-lock-row">
          <p v-if="!isLocked && memberCount < requiredSize" class="ts-lock-hint">
            {{ t('tournament.lockHint', { needed: requiredSize - memberCount }) }}
          </p>
          <p v-if="tournamentFull" class="ts-lock-hint">{{ t('teams.tournamentFullHint') }}</p>
          <button
            v-if="!isLocked"
            class="ts-btn ts-btn-lock"
            :disabled="!canLock || isSubmitting"
            @click="lockTeam"
          >
            {{ isSubmitting ? '...' : t('tournament.lockTeam') }}
          </button>
          <template v-else>
            <div class="ts-locked-badge">
              ✓ {{ t('tournament.registrationComplete') }}
            </div>
            <template v-if="canUnlock">
              <p class="ts-lock-hint">{{ t('teams.unlockHint') }}</p>
              <button class="ts-btn ts-btn-ghost ts-btn-unlock" :disabled="isSubmitting" @click="unlockTeam">
                {{ t('teams.unlockTeam') }}
              </button>
            </template>
          </template>
        </div>
        <div v-else-if="isLocked" class="ts-lock-row">
          <div class="ts-locked-badge">
            ✓ {{ t('tournament.registrationComplete') }}
          </div>
        </div>

        <!-- Danger zone: delete (captain) or leave (member) -->
        <div v-if="(isCaptain && !isLocked) || canLeave" class="ts-danger-row">
          <button
            v-if="isCaptain"
            class="ts-btn ts-btn-danger"
            :disabled="isSubmitting"
            @click="askDelete"
          >
            {{ t('tournament.deleteTeam') }}
          </button>
          <button
            v-else
            class="ts-btn ts-btn-danger"
            :disabled="isSubmitting"
            @click="askLeave"
          >
            {{ t('tournament.leaveTeam') }}
          </button>
        </div>
      </div>

    </template>

    <ConfirmDialog
      v-if="confirmCopy"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.confirmLabel"
      :danger="confirmCopy.danger"
      @confirm="runConfirmed"
      @cancel="confirmState = null"
    />
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
.ts-inv-icon { color: var(--accent-primary); margin: 0 auto; }
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
.ts-btn-accent:not(:disabled):hover { opacity: 0.85; }

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
.ts-btn-lock:not(:disabled):hover { background: var(--color-success-bg); }

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
.ts-btn-danger:not(:disabled):hover { background: var(--color-error-bg); }

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
.ts-tag-admin { color: var(--color-info); background: var(--bg-tertiary); border: var(--hud-border) solid var(--color-info); }

.ts-slot-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.ts-slot-action {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.ts-slot-action:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.ts-slot-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ts-slot-action-danger:hover:not(:disabled) {
  color: var(--color-error);
  border-color: var(--color-error);
}

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

/* Banners */
.ts-banner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
}
.ts-banner-warning {
  color: var(--color-warning);
  border-color: var(--color-warning);
  background: rgba(234,179,8,0.08);
}
.ts-banner strong { letter-spacing: var(--tracking-widest); }

/* Team title + rename */
.ts-team-title-block {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
  flex: 1;
}
.ts-team-header { gap: var(--space-3); }

/* Sub-sections */
.ts-link-panel,
.ts-requests-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: var(--hud-border) solid var(--glass-border);
}
.ts-subtitle {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
}
.ts-count-badge {
  padding: 0 var(--space-2);
  color: var(--bg-primary);
  background: var(--accent-primary);
  font-size: 10px;
}
.ts-link-panel .ts-form-row { flex-wrap: wrap; }
.ts-link-input {
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* Join requests */
.ts-request-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ts-request {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}
.ts-request-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ts-request-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}
.ts-request-note {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  overflow-wrap: anywhere;
}

.ts-btn-unlock { align-self: flex-start; }

/* Mobile */
@media (max-width: 480px) {
  .team-setup { padding: var(--space-4); }
  .team-setup-header { flex-wrap: wrap; }
  .ts-invitation-card,
  .ts-create-card,
  .ts-team-card { padding: var(--space-4); }
  .ts-slot { flex-wrap: wrap; }
  .ts-slot-actions { margin-left: 0; flex-wrap: wrap; width: 100%; }
  .ts-form-row { flex-wrap: wrap; }
  .ts-form-row .ts-input { min-width: 0; flex: 1 1 100%; }
  .ts-inv-actions { flex-wrap: wrap; }
}
</style>
