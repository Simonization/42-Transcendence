<script setup lang="ts">
import HudIcon from '../hud/HudIcon.vue'
/**
 * MyTournamentsTab — List, edit, delete tournaments
 * Admin view of all tournaments with inline editing
 */

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { tournamentsApi } from '../../api/tournaments'
import { useNotificationsStore } from '../../stores/notifications'
import { getErrorMessage } from '../../utils/error'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import type { BackendTournament } from '../../types'
import type { SeedingView } from '../../types/tournament'
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
const editScheduledAt = ref('')

// Confirm delete
const confirmDeleteId = ref<number | null>(null)

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
      scheduled_at: editScheduledAt.value
        ? new Date(editScheduledAt.value).toISOString()
        : null,
    })
    notifications.success(t('admin.tournamentUpdated'))
    editingId.value = null
    await fetchTournaments()
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.updateFailed')))
  }
}

// --- Start, behind a confirmation that names the teams it drops ---

const startCandidate = ref<{ tournament: BackendTournament; seeding: SeedingView } | null>(null)
const isStarting = ref(false)

const startMessage = computed(() => {
  const c = startCandidate.value
  if (!c) return ''
  const entering = t('adminTournaments.startMessage', { count: c.seeding.teams.length })
  const dropped = c.seeding.excluded.map(team => team.name).join(', ')
  return `${entering} ${
    dropped ? t('adminTournaments.startDropsDrafts', { teams: dropped }) : t('adminTournaments.startNoDrafts')
  }`
})

async function askStart(tournament: BackendTournament) {
  try {
    startCandidate.value = { tournament, seeding: await tournamentsApi.getSeeding(tournament.id) }
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.startFailed')))
  }
}

async function startTournament() {
  const c = startCandidate.value
  if (!c || isStarting.value) return
  isStarting.value = true
  try {
    await tournamentsApi.start(c.tournament.id)
    notifications.success(t('adminTournaments.started'))
    seedingFor.value = null
    await fetchTournaments()
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.startFailed')))
  } finally {
    isStarting.value = false
    startCandidate.value = null
  }
}

// --- Seeding editor: reorder the LOCKED teams before start ---

const seedingFor = ref<number | null>(null)
const seedingOrder = ref<{ id: number; name: string }[]>([])
const seedingExcluded = ref<string[]>([])
const seedingLoading = ref(false)
const seedingSaving = ref(false)

async function toggleSeeding(id: number) {
  if (seedingFor.value === id) {
    seedingFor.value = null
    return
  }
  seedingFor.value = id
  seedingLoading.value = true
  try {
    const view = await tournamentsApi.getSeeding(id)
    seedingOrder.value = view.teams.map(team => ({ id: team.id, name: team.name }))
    seedingExcluded.value = view.excluded.map(team => team.name)
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.seedingFailed')))
    seedingFor.value = null
  } finally {
    seedingLoading.value = false
  }
}

function moveSeed(index: number, delta: -1 | 1) {
  const target = index + delta
  if (target < 0 || target >= seedingOrder.value.length) return
  const next = [...seedingOrder.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  seedingOrder.value = next
}

async function saveSeeding(id: number) {
  seedingSaving.value = true
  try {
    const view = await tournamentsApi.setSeeding(id, seedingOrder.value.map(team => team.id))
    seedingOrder.value = view.teams.map(team => ({ id: team.id, name: team.name }))
    notifications.success(t('adminTournaments.seedingSaved'))
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.seedingFailed')))
  } finally {
    seedingSaving.value = false
  }
}

async function deleteTournament(id: number) {
  try {
    await tournamentsApi.delete(id)
    notifications.success(t('admin.tournamentDeleted'))
    confirmDeleteId.value = null
    await fetchTournaments()
  } catch (err) {
    notifications.error(getErrorMessage(err, t('adminTournaments.deleteFailed')))
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
      <div class="empty-state-icon"><HudIcon name="tournament" :size="26" /></div>
      <h3 class="empty-state-title">{{ t('admin.noTournamentsCreated') }}</h3>
      <p class="empty-state-text">{{ t('admin.noTournamentsHint') }}</p>
    </div>

    <!-- Tournaments table -->
    <table v-else class="table">
      <caption class="visually-hidden">{{ t('adminTournaments.tableCaption') }}</caption>
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
        <template v-for="tournament in tournaments" :key="tournament.id">
        <tr>
          <!-- Editing row -->
          <template v-if="editingId === tournament.id">
            <td>
              <input v-model="editName" type="text" class="inline-input" />
              <input v-model="editDescription" type="text" class="inline-input inline-input-desc" :placeholder="t('adminTournaments.descriptionPlaceholder')" />
            </td>
            <td>
              <span class="status-badge" :class="statusClass(tournament.status)">
                {{ statusLabel(tournament.status) }}
              </span>
            </td>
            <td>
              <input v-model="editScheduledAt" type="datetime-local" class="inline-input inline-input-datetime" />
            </td>
            <td>
              <input v-model.number="editMaxParticipants" type="number" class="inline-input inline-input-small" min="2" max="256" :placeholder="t('adminTournaments.maxPlaceholder')" />
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
                <button
                  v-if="tournament.status === TournamentStatus.REGISTRATION_OPEN"
                  class="action-link action-start"
                  :disabled="isStarting"
                  @click="askStart(tournament)"
                >
                  {{ t('adminTournaments.start') }}
                </button>
                <button
                  v-if="tournament.status === TournamentStatus.REGISTRATION_OPEN"
                  class="action-link"
                  :aria-expanded="seedingFor === tournament.id"
                  @click="toggleSeeding(tournament.id)"
                >
                  {{ t('adminTournaments.seeding') }}
                </button>
                <button class="action-link" @click="startEdit(tournament)">{{ t('admin.editAction') }}</button>
                <button class="action-link action-danger" @click="confirmDeleteId = tournament.id">{{ t('common.delete') }}</button>
              </template>
            </td>
          </template>
        </tr>
        <!-- Seeding editor, under its tournament -->
        <tr v-if="seedingFor === tournament.id" class="seeding-row">
          <td colspan="5">
            <div class="seeding-panel">
              <div class="seeding-head">
                <span class="seeding-title">{{ t('adminTournaments.seedingTitle') }}</span>
                <span class="seeding-hint">{{ t('adminTournaments.seedingHint') }}</span>
              </div>
              <div v-if="seedingLoading" class="loading-state">{{ t('common.loadingDots') }}</div>
              <p v-else-if="!seedingOrder.length" class="seeding-hint">{{ t('adminTournaments.seedingEmpty') }}</p>
              <ol v-else class="seed-list">
                <li v-for="(team, i) in seedingOrder" :key="team.id" class="seed-item">
                  <span class="seed-number">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="seed-name">{{ team.name }}</span>
                  <button
                    class="seed-move"
                    :disabled="i === 0"
                    :aria-label="t('adminTournaments.moveUp', { team: team.name })"
                    @click="moveSeed(i, -1)"
                  >&uarr;</button>
                  <button
                    class="seed-move"
                    :disabled="i === seedingOrder.length - 1"
                    :aria-label="t('adminTournaments.moveDown', { team: team.name })"
                    @click="moveSeed(i, 1)"
                  >&darr;</button>
                </li>
              </ol>
              <p v-if="seedingExcluded.length" class="seeding-hint">
                {{ t('adminTournaments.notEntering', { teams: seedingExcluded.join(', ') }) }}
              </p>
              <div class="seeding-actions">
                <button
                  class="action-link action-save"
                  :disabled="seedingSaving || !seedingOrder.length"
                  @click="saveSeeding(tournament.id)"
                >
                  {{ t('adminTournaments.saveSeeding') }}
                </button>
                <button class="action-link" @click="seedingFor = null">{{ t('common.close') }}</button>
              </div>
            </div>
          </td>
        </tr>
        </template>
      </tbody>
    </table>

    <ConfirmDialog
      v-if="startCandidate"
      :title="t('adminTournaments.startTitle', { name: startCandidate.tournament.name })"
      :message="startMessage"
      :confirm-label="t('adminTournaments.start')"
      danger
      @confirm="startTournament"
      @cancel="startCandidate = null"
    />
  </div>
</template>

<style scoped>
.action-start {
  color: var(--color-success);
  font-weight: var(--font-bold);
}

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

.action-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Seeding editor */
.seeding-row td {
  background: var(--bg-secondary);
}

.seeding-row:hover {
  background: transparent;
}

.seeding-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.seeding-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
}

.seeding-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-primary);
}

.seeding-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.seed-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 480px;
  border-top: var(--hud-border) solid var(--border-subtle);
}

.seed-item {
  display: grid;
  grid-template-columns: 3ch 1fr auto auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.seed-number {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-heavy);
  color: var(--accent-primary);
}

.seed-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.seed-move {
  width: 2rem;
  height: 1.75rem;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
}

.seed-move:hover:not(:disabled) {
  background: var(--bg-selected);
}

.seed-move:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.seed-move:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
}

.seeding-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
