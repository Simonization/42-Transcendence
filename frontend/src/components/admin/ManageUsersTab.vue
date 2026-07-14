<script setup lang="ts">
/**
 * ManageUsersTab — Admin user management interface
 * Search, view, ban/unban, edit username, remove avatar
 */

import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminUsers } from '../../composables/useAdminUsers'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import DemoBanner from '../common/DemoBanner.vue'

const { t } = useI18n()
const {
  users,
  page,
  isLoading,
  error,
  demoMode,
  totalPages,
  fetchUsers,
  setSearch,
  goToPage,
  banUser,
  unbanUser,
  removeAvatar,
  editUsername,
  editDisplayName,
} = useAdminUsers()

// Search debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const searchInput = ref('')

const onSearchInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  searchInput.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => setSearch(val), 300)
}

// Inline edit
const editingUserId = ref<number | null>(null)
const editingName = ref('')
const editingField = ref<'username' | 'displayName'>('username')

const startEdit = (userId: number, field: 'username' | 'displayName', currentName: string) => {
  editingUserId.value = userId
  editingField.value = field
  editingName.value = currentName
}

const confirmEdit = async () => {
  if (editingUserId.value && editingName.value.trim()) {
    if (editingField.value === 'username') {
      await editUsername(editingUserId.value, editingName.value.trim())
    } else {
      await editDisplayName(editingUserId.value, editingName.value.trim())
    }
    editingUserId.value = null
  }
}

const cancelEdit = () => {
  editingUserId.value = null
}

// Ban modal
const banDialogUserId = ref<number | null>(null)
const banUnit = ref<'hours' | 'days' | 'permanent'>('hours')
const banValue = ref(24)

const openBanDialog = (userId: number) => {
  banDialogUserId.value = userId
  banUnit.value = 'hours'
  banValue.value = 24
}

const closeBanDialog = () => {
  banDialogUserId.value = null
}

const confirmBanWithDuration = async () => {
  if (!banDialogUserId.value) return
  const options = banUnit.value === 'permanent'
    ? { banUnit: 'permanent' as const }
    : { banUnit: banUnit.value, banValue: Math.max(1, Math.floor(Number(banValue.value) || 1)) }
  await banUser(banDialogUserId.value, options)
  closeBanDialog()
}

// Confirm dialogs
const confirmAction = ref<{ type: 'ban' | 'unban' | 'removeAvatar'; userId: number } | null>(null)

const confirmMessage = ref('')

const showConfirm = (type: 'ban' | 'unban' | 'removeAvatar', userId: number) => {
  if (type === 'ban') {
    openBanDialog(userId)
    return
  }
  confirmAction.value = { type, userId }
  if (type === 'unban') confirmMessage.value = t('admin.confirmUnban')
  else confirmMessage.value = t('admin.confirmRemoveAvatar')
}

const handleConfirm = async () => {
  if (!confirmAction.value) return
  const { type, userId } = confirmAction.value
  if (type === 'unban') await unbanUser(userId)
  else if (type === 'removeAvatar') await removeAvatar(userId)
  confirmAction.value = null
}

const getRoleName = (role?: number) => {
  switch (role) {
    case 1: return 'Admin'
    case 2: return 'Moderator'
    case 999: return 'Bot'
    default: return 'User'
  }
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="manage-users">
    <DemoBanner v-if="demoMode" />
    <h2 class="section-title">{{ $t('admin.manageUsersTitle') }}</h2>

    <!-- Search Bar -->
    <div class="search-bar">
      <input
        type="text"
        class="search-input"
        :placeholder="$t('admin.searchUsers')"
        :value="searchInput"
        @input="onSearchInput"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <span class="loading-spinner"></span>
      <p class="loading-text">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p class="error-text">{{ error }}</p>
      <button class="action-link" @click="fetchUsers()">{{ $t('common.retry') }}</button>
    </div>

    <!-- Empty -->
    <div v-else-if="users.length === 0" class="empty-state">
      <p class="empty-text">{{ $t('admin.noUsersFound') }}</p>
    </div>

    <!-- Users Table -->
    <div v-else class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>{{ $t('admin.username') }}</th>
            <th>{{ $t('admin.email') }}</th>
            <th>{{ $t('admin.role') }}</th>
            <th>{{ $t('admin.statusCol') }}</th>
            <th>{{ $t('admin.actionsCol') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="cell-username">
              <template v-if="editingUserId === u.id">
                <input
                  v-model="editingName"
                  class="inline-edit-input"
                  :placeholder="editingField === 'username' ? $t('admin.username') : 'Display Name'"
                  @keydown.enter.prevent="confirmEdit"
                  @keydown.escape="cancelEdit"
                />
                <button class="action-link action-link-save" @click="confirmEdit">{{ $t('common.save') }}</button>
                <button class="action-link" @click="cancelEdit">{{ $t('common.cancel') }}</button>
              </template>
              <template v-else>
                <span class="username-text">{{ u.username }}</span>
                <div class="display-name-text">{{ u.profile?.displayName || '-' }}</div>
              </template>
            </td>
            <td>{{ u.mail }}</td>
            <td>
              <span class="role-badge">{{ getRoleName(u.role) }}</span>
            </td>
            <td>
              <span
                class="status-badge"
                :class="u.status === 1 ? 'status-banned' : 'status-active'"
              >
                {{ u.status === 1 ? $t('admin.userBanned') : $t('admin.userActive') }}
              </span>
            </td>
            <td class="cell-actions">
              <button class="action-link" @click="startEdit(u.id, 'username', u.username)">
                {{ $t('admin.editAction') }} username
              </button>
              <button class="action-link" @click="startEdit(u.id, 'displayName', u.profile?.displayName || '')">
                {{ $t('admin.editAction') }} display
              </button>
              <button
                v-if="u.status === 1"
                class="action-link"
                @click="showConfirm('unban', u.id)"
              >
                {{ $t('admin.unbanAction') }}
              </button>
              <button
                v-else
                class="action-link action-link-danger"
                @click="showConfirm('ban', u.id)"
              >
                {{ $t('admin.banAction') }}
              </button>
              <button
                v-if="u.avatarUrl"
                class="action-link"
                @click="showConfirm('removeAvatar', u.id)"
              >
                {{ $t('admin.removeAvatar') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="pagination-btn"
        :disabled="page === 1"
        @click="goToPage(page - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="pagination-info">{{ $t('common.pageOf', { current: page, total: totalPages }) }}</span>
      <button
        class="pagination-btn"
        :disabled="page === totalPages"
        @click="goToPage(page + 1)"
      >
        {{ $t('common.next') }}
      </button>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-if="confirmAction"
      :title="confirmAction.type === 'ban' ? $t('admin.banAction') : confirmAction.type === 'unban' ? $t('admin.unbanAction') : $t('admin.removeAvatar')"
      :message="confirmMessage"
      :danger="confirmAction.type === 'ban'"
      @confirm="handleConfirm"
      @cancel="confirmAction = null"
    />

    <Teleport to="body">
      <div v-if="banDialogUserId" class="ban-backdrop" @click.self="closeBanDialog">
        <div class="ban-panel" role="dialog" aria-modal="true">
          <h3 class="ban-title">{{ $t('admin.banAction') }}</h3>
          <p class="ban-message">{{ $t('admin.confirmBan') }}</p>

          <label class="ban-label" for="ban-unit">{{ $t('admin.banDurationType') }}</label>
          <select id="ban-unit" v-model="banUnit" class="ban-input">
            <option value="hours">{{ $t('admin.banHours') }}</option>
            <option value="days">{{ $t('admin.banDays') }}</option>
            <option value="permanent">{{ $t('admin.banPermanent') }}</option>
          </select>

          <template v-if="banUnit !== 'permanent'">
            <label class="ban-label" for="ban-value">{{ $t('admin.banDurationValue') }}</label>
            <input id="ban-value" v-model.number="banValue" type="number" min="1" class="ban-input" />
          </template>

          <div class="ban-actions">
            <button class="btn btn-secondary" @click="closeBanDialog">{{ $t('confirm.defaultCancel') }}</button>
            <button class="btn btn-danger" @click="confirmBanWithDuration">{{ $t('common.confirm') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.manage-users {
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

/* Search */
.search-bar {
  position: relative;
}

.search-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
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

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.display-name-text {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.ban-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.ban-panel {
  width: 100%;
  max-width: 420px;
  padding: var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
}

.ban-title {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-base);
  text-transform: uppercase;
}

.ban-message {
  margin: 0 0 var(--space-4) 0;
  color: var(--text-secondary);
}

.ban-label {
  display: block;
  margin: var(--space-2) 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.ban-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.ban-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

/* Error */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
}

.error-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-error);
}

/* Empty */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
}

.empty-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Table */
.table-container {
  overflow-x: auto;
}

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

.cell-username {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.username-text {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.inline-edit-input {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--accent-primary);
  color: var(--text-primary);
  min-width: 120px;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
}

.status-active {
  background: var(--color-success-dark);
  color: white;
}

.status-banned {
  background: var(--color-error);
  color: white;
}

.role-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

/* Actions */
.cell-actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

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

.action-link-danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-link-danger:hover {
  background: var(--color-error);
  color: white;
}

.action-link-save {
  color: var(--color-success);
  border-color: var(--color-success);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.pagination-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.pagination-btn:not(:disabled):hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Responsive */
@media (max-width: 768px) {
  .table {
    font-size: var(--text-xs);
  }

  .table th,
  .table td {
    padding: var(--space-2);
  }

  .cell-actions {
    flex-direction: column;
  }
}
</style>
