<script setup lang="ts">
/**
 * ManageGamesTab — Admin CRUD for game templates
 * Games define team count/size used by tournaments
 */

import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gamesApi } from '../../api/games'
import { useNotificationsStore } from '../../stores/notifications'
import type { BackendGame } from '../../types'

const { t } = useI18n()
const notifications = useNotificationsStore()

const games = ref<BackendGame[]>([])
const isLoading = ref(false)

// Inline add form
const showAddForm = ref(false)
const newName = ref('')
const newTeamCount = ref(2)
const newTeamSize = ref(1)
const isSaving = ref(false)

// Inline edit state
const editingId = ref<number | null>(null)
const editName = ref('')
const editTeamCount = ref(2)
const editTeamSize = ref(1)

// Confirm delete
const confirmDeleteId = ref<number | null>(null)

async function fetchGames() {
  isLoading.value = true
  try {
    games.value = await gamesApi.getAll()
  } catch {
    games.value = []
  } finally {
    isLoading.value = false
  }
}

async function createGame() {
  if (!newName.value.trim()) return
  isSaving.value = true
  try {
    await gamesApi.create({
      name: newName.value.trim(),
      team_count: newTeamCount.value,
      team_size: newTeamSize.value,
    })
    notifications.addNotification({ type: 'success', message: t('admin.gameCreated') })
    newName.value = ''
    newTeamCount.value = 2
    newTeamSize.value = 1
    showAddForm.value = false
    await fetchGames()
  } catch {
    notifications.addNotification({ type: 'error', message: 'Failed to create game' })
  } finally {
    isSaving.value = false
  }
}

function startEdit(game: BackendGame) {
  editingId.value = game.id
  editName.value = game.name
  editTeamCount.value = game.teamCount
  editTeamSize.value = game.teamSize
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: number) {
  try {
    await gamesApi.update(id, {
      name: editName.value.trim(),
      team_count: editTeamCount.value,
      team_size: editTeamSize.value,
    })
    notifications.addNotification({ type: 'success', message: t('admin.gameUpdated') })
    editingId.value = null
    await fetchGames()
  } catch {
    notifications.addNotification({ type: 'error', message: 'Failed to update game' })
  }
}

async function deleteGame(id: number) {
  try {
    await gamesApi.delete(id)
    notifications.addNotification({ type: 'success', message: t('admin.gameDeleted') })
    confirmDeleteId.value = null
    await fetchGames()
  } catch {
    notifications.addNotification({ type: 'error', message: 'Failed to delete game' })
  }
}

onMounted(fetchGames)
</script>

<template>
  <div class="manage-games-content">
    <div class="section-header">
      <h2 class="section-title">{{ t('admin.manageGamesTitle') }}</h2>
      <button class="add-btn" @click="showAddForm = !showAddForm">
        {{ showAddForm ? t('common.cancel') : t('admin.addGame') }}
      </button>
    </div>

    <!-- Add Game Form -->
    <div v-if="showAddForm" class="add-form">
      <div class="form-row">
        <label class="form-label">
          {{ t('admin.gameName') }}
          <input v-model="newName" type="text" class="form-input" :placeholder="t('admin.gameName')" />
        </label>
        <label class="form-label">
          {{ t('admin.teamCount') }}
          <input v-model.number="newTeamCount" type="number" class="form-input form-input-small" min="2" max="16" />
        </label>
        <label class="form-label">
          {{ t('admin.teamSize') }}
          <input v-model.number="newTeamSize" type="number" class="form-input form-input-small" min="1" max="10" />
        </label>
        <button class="save-btn" :disabled="!newName.trim() || isSaving" @click="createGame">
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">{{ t('common.loadingDots') }}</div>

    <!-- Empty state -->
    <div v-else-if="games.length === 0" class="empty-state">
      <div class="empty-state-icon">🎮</div>
      <h3 class="empty-state-title">{{ t('admin.noGamesFound') }}</h3>
      <p class="empty-state-text">{{ t('admin.noGamesHint') }}</p>
    </div>

    <!-- Games table -->
    <table v-else class="table">
      <caption class="visually-hidden">Game templates with name, team count, team size, and actions</caption>
      <thead>
        <tr>
          <th>{{ t('admin.gameName') }}</th>
          <th>{{ t('admin.teamCount') }}</th>
          <th>{{ t('admin.teamSize') }}</th>
          <th>{{ t('admin.actionsCol') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="game in games" :key="game.id">
          <!-- Editing row -->
          <template v-if="editingId === game.id">
            <td><input v-model="editName" type="text" class="inline-input" /></td>
            <td><input v-model.number="editTeamCount" type="number" class="inline-input inline-input-small" min="2" max="16" /></td>
            <td><input v-model.number="editTeamSize" type="number" class="inline-input inline-input-small" min="1" max="10" /></td>
            <td class="actions-cell">
              <button class="action-link action-save" @click="saveEdit(game.id)">{{ t('common.save') }}</button>
              <button class="action-link" @click="cancelEdit">{{ t('common.cancel') }}</button>
            </td>
          </template>
          <!-- Display row -->
          <template v-else>
            <td>{{ game.name }}</td>
            <td>{{ game.teamCount }}</td>
            <td>{{ game.teamSize }}</td>
            <td class="actions-cell">
              <template v-if="confirmDeleteId === game.id">
                <span class="confirm-text">{{ t('admin.confirmDeleteGame') }}</span>
                <button class="action-link action-danger" @click="deleteGame(game.id)">{{ t('common.yes') }}</button>
                <button class="action-link" @click="confirmDeleteId = null">{{ t('common.no') }}</button>
              </template>
              <template v-else>
                <button class="action-link" @click="startEdit(game)">{{ t('common.edit') }}</button>
                <button class="action-link action-danger" @click="confirmDeleteId = game.id">{{ t('common.delete') }}</button>
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

.manage-games-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.section-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.add-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.add-btn:hover {
  background: var(--bg-selected);
}

/* Add form */
.add-form {
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.form-input {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
  min-width: 180px;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-input-small {
  min-width: 80px;
  max-width: 100px;
}

.save-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--accent-primary);
  border: none;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  margin: var(--space-2) 0 0 0;
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
}

.table tbody tr:hover {
  background: var(--bg-selected);
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Inline edit inputs */
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

.inline-input-small {
  max-width: 80px;
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

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }

  .form-input {
    min-width: unset;
  }

  .form-input-small {
    max-width: unset;
  }
}
</style>
