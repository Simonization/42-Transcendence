<script setup lang="ts">
/**
 * Team Invitations Panel
 * Shows pending team invitations with accept/decline buttons.
 * Intended to be placed in the sidebar or notification area.
 */

import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTeams } from '../../composables/useTeams'
import { useNotificationsStore } from '../../stores/notifications'

const { t } = useI18n()
const notifications = useNotificationsStore()
const {
  myInvitations,
  isLoading,
  fetchMyInvitations,
  acceptInvitation,
  declineInvitation,
} = useTeams()

onMounted(() => {
  fetchMyInvitations()
})

const handleAccept = async (invitationId: number) => {
  const success = await acceptInvitation(invitationId)
  if (success) {
    notifications.success(t('teams.inviteAccepted'), 3000)
  } else {
    notifications.error(t('teams.inviteAcceptFailed'), 3000)
  }
}

const handleDecline = async (invitationId: number) => {
  const success = await declineInvitation(invitationId)
  if (success) {
    notifications.info(t('teams.inviteDeclined'), 3000)
  } else {
    notifications.error(t('teams.inviteDeclineFailed'), 3000)
  }
}
</script>

<template>
  <div v-if="myInvitations.length > 0 || isLoading" class="invitations-panel">
    <h3 class="panel-title">{{ $t('teams.pendingInvitations') }}</h3>

    <div v-if="isLoading" class="loading-text">
      {{ $t('common.loading') }}
    </div>

    <div v-else class="invitations-list">
      <div
        v-for="invite in myInvitations"
        :key="invite.id"
        class="invitation-card"
      >
        <div class="invitation-info">
          <span class="invitation-team">{{ invite.team?.name ?? $t('teams.unknownTeam') }}</span>
          <span class="invitation-from">
            {{ $t('teams.invitedBy', { name: invite.sender?.username ?? '?' }) }}
          </span>
        </div>
        <div class="invitation-actions">
          <button
            class="btn-accept"
            @click="handleAccept(invite.id)"
            :aria-label="$t('teams.acceptInvite')"
          >
            ✓
          </button>
          <button
            class="btn-decline"
            @click="handleDecline(invite.id)"
            :aria-label="$t('teams.declineInvite')"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invitations-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-elevated);
  border: var(--hud-border) solid var(--border-subtle);
}

.panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.invitations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.invitation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  transition: background var(--duration-fast) var(--ease-default);
}

.invitation-card:hover {
  background: var(--bg-hover);
}

.invitation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.invitation-team {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invitation-from {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.invitation-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.btn-accept,
.btn-decline {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  border: var(--hud-border) solid var(--border-subtle);
  background: transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.btn-accept {
  color: var(--color-success);
}

.btn-accept:hover {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.btn-decline {
  color: var(--color-error);
}

.btn-decline:hover {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}
</style>
