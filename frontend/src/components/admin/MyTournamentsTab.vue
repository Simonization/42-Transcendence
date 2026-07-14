<script setup lang="ts">
/**
 * MyTournamentsTab — List, edit, delete tournaments
 * Admin view of all tournaments with inline editing
 */

import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { tournamentsApi } from '../../api/tournaments'
import { useNotificationsStore } from '../../stores/notifications'
import type { BackendTournament } from '../../types'
import { TournamentStatus } from '../../types'

const { t } = useI18n()
const notifications = useNotificationsStore()

const tournaments = ref<BackendTournament[]>([])
const isLoading = ref(false)

// Edit state
const editingId = ref<number | null>(null)
const editName = ref('')
const editDescription = ref('')
const editMaxParticipants = ref<number | undefined>(undefined)
const editStatus = ref('')
const editScheduledAt = ref('')

// Confirm delete
const confirmDeleteId = ref<number | null>(null)

const statusOptions = [
  TournamentStatus.DRAFT,
  TournamentStatus.REGISTRATION_OPEN,
  TournamentStatus.ONGOING,
  TournamentStatus.COMPLETED,
]

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function statusClass(status: string): string {
  switch (status) {
    case TournamentStatus.REGISTRATION_OPEN: return 'status-open'
    case TournamentStatus.ONGOING: return 'status-ongoing'
    case TournamentStatus.COMPLETED: return 'status-completed'
    default: return 'status-draft'
  }
}

async function fetchTournaments() {
  isLoading.value = true
  try {
    tournaments.value = await tournamentsApi.getAll()
  } catch {
    tournaments.value = []
  } finally {
    isLoading.value = false
  }
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  // slice to 'YYYY-MM-DDTHH:mm' for datetime-local input
  return new Date(iso).toISOString().slice(0, 16)
}

function startEdit(t: BackendTournament) {
  editingId.value = t.id
  editName.value = t.name
  editDescription.value = t.description ?? ''
  editMaxParticipants.value = t.max_participants ?? undefined
  editStatus.value = t.status
  editScheduledAt.value = toDatetimeLocal(t.scheduledAt)
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: number) {
  try {
    await tournamentsApi.update(id, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
      max_participants: editMaxParticipants.value,
      status: editStatus.value as TournamentStatus,
      scheduled_at: editScheduledAt.value
        ? new Date(editScheduledAt.value).toISOString()
        : null,
    })
    notifications.success(t('admin.tournamentUpdated'))
    editingId.value = null
    await fetchTournaments()
  } catch {
    notifications.error('Failed to update tournament')
  }
}

async function deleteTournament(id: number) {
  try {
    await tournamentsApi.delete(id)
    notifications.success(t('admin.tournamentDeleted'))
    confirmDeleteId.value = null
    await fetchTournaments()
  } catch {
    notifications.error('Failed to delete tournament')
  }
}

onMounted(fetchTournaments)
</script>

<template>
  <div class="my-tournaments-content">
    <h2 class="section-title">{{ t('admin.myTournaments') }}</h2>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">{{ t('common.loadingDots') }}</div>

    <!-- Empty state -->
    <div v-else-if="tournaments.length === 0" class="empty-state">
      <div class="empty-state-icon">🏆</div>
      <h3 class="empty-state-title">{{ t('admin.noTournamentsCreated') }}</h3>
      <p class="empty-state-text">{{ t('admin.noTournamentsHint') }}</p>
    </div>

    <!-- Tournaments table -->
    <table v-else class="table">
      <caption class="visually-hidden">Tournaments with name, status, teams, and actions</caption>
      <thead>
        <tr>
          <th>{{ t('admin.name') }}</th>
          <th>{{ t('admin.statusCol') }}</th>
          <th>{{ t('admin.scheduledAt') }}</th>
          <th>{{ t('admin.participantsCol') }}</th>
          <th>{{ t('admin.actionsCol') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tournament in tournaments" :key="tournament.id">
          <!-- Editing row -->
          <template v-if="editingId === tournament.id">
            <td>
              <input v-model="editName" type="text" class="inline-input" />
              <input v-model="editDescription" type="text" class="inline-input inline-input-desc" placeholder="Description" />
            </td>
            <td>
              <select v-model="editStatus" class="inline-select">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
              </select>
            </td>
            <td>
              <input v-model="editScheduledAt" type="datetime-local" class="inline-input inline-input-datetime" />
            </td>
            <td>
              <input v-model.number="editMaxParticipants" type="number" class="inline-input inline-input-small" min="2" max="256" placeholder="Max" />
            </td>
            <td class="actions-cell">
              <button class="action-link action-save" @click="saveEdit(tournament.id)">{{ t('common.save') }}</button>
              <button class="action-link" @click="cancelEdit">{{ t('common.cancel') }}</button>
            </td>
          </template>
          <!-- Display row -->
          <template v-else>
            <td>
              <div class="tournament-name">{{ tournament.name }}</div>
              <div v-if="tournament.description" class="tournament-desc">{{ tournament.description }}</div>
            </td>
            <td>
              <span class="status-badge" :class="statusClass(tournament.status)">
                {{ statusLabel(tournament.status) }}
              </span>
            </td>
            <td class="scheduled-cell">
              <span v-if="tournament.scheduledAt" class="scheduled-date">
                {{ new Date(tournament.scheduledAt).toLocaleString() }}
              </span>
              <span v-else class="scheduled-none">—</span>
            </td>
            <td>
              {{ tournament.teams?.length ?? 0 }}{{ tournament.max_participants ? ` / ${tournament.max_participants}` : '' }}
            </td>
            <td class="actions-cell">
              <template v-if="confirmDeleteId === tournament.id">
                <span class="confirm-text">{{ t('admin.confirmDeleteTournament') }}</span>
                <button class="action-link action-danger" @click="deleteTournament(tournament.id)">{{ t('common.yes') }}</button>
                <button class="action-link" @click="confirmDeleteId = null">{{ t('common.no') }}</button>
              </template>
              <template v-else>
                <button class="action-link" @click="startEdit(tournament)">{{ t('admin.editAction') }}</button>
                <button class="action-link action-danger" @click="confirmDeleteId = tournament.id">{{ t('common.delete') }}</button>
              </template>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
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

.my-tournaments-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

/* Loading */
.loading-state {
  text-align: center;
  padding: var(--space-8);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  background: var(--bg-tertiary);
  border: var(--hud-border) dashed var(--border-subtle);
}

.empty-state-icon {
  font-size: var(--text-6xl);
  margin-bottom: var(--space-4);
}

.empty-state-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.empty-state-text {
  margin: var(--space-2) 0 var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table thead {
  background: var(--bg-tertiary);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.table th {
  padding: var(--space-3);
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.table td {
  padding: var(--space-3);
  border-bottom: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  vertical-align: top;
}

.table tbody tr:hover {
  background: var(--bg-selected);
}

.tournament-name {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.tournament-desc {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  border: var(--hud-border) solid;
}

.status-draft {
  color: var(--text-tertiary);
  border-color: var(--border-subtle);
}

.status-open {
  color: var(--color-success);
  border-color: var(--color-success);
}

.status-ongoing {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.status-completed {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

/* Inline editing */
.inline-input {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--accent-primary);
  width: 100%;
}

.inline-input:focus {
  outline: none;
}

.inline-input-desc {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
}

.inline-input-small {
  max-width: 80px;
}

.inline-input-datetime {
  max-width: 200px;
  color-scheme: dark;
}

.scheduled-cell {
  white-space: nowrap;
}

.scheduled-date {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wide);
}

.scheduled-none {
  color: var(--text-tertiary);
}

.inline-select {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--accent-primary);
}

.inline-select:focus {
  outline: none;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Action buttons */
.action-link {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.action-link:hover {
  background: var(--bg-selected);
}

.action-save {
  color: var(--color-success);
  border-color: var(--color-success);
}

.action-danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.confirm-text {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-right: var(--space-2);
}
</style>
