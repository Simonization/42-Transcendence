<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useOrganizations } from '../../composables/useOrganizations'
import { usersApi } from '../../api/users'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import DemoBanner from '../../components/common/DemoBanner.vue'
import type { Organization, User } from '../../types'

const { t } = useI18n()
const authStore = useAuthStore()
const userId = authStore.user?.id || 0

const {
  organizations,
  selectedOrg,
  members,
  isLoading,
  isLoadingMembers,
  error,
  searchQuery,
  myOrgs,
  currentUserRole,
  canManage,
  demoMode,
  fetchOrganizations,
  selectOrg,
  deselectOrg,
  createOrg,
  updateOrg,
  deleteOrg,
  addMember,
  removeMember,
  setSearch,
} = useOrganizations(userId)

// UI state
const showCreateForm = ref(false)
const newOrgName = ref('')
const newOrgDescription = ref('')
const addMemberQuery = ref('')
const addMemberResults = ref<User[]>([])
let addMemberTimer: ReturnType<typeof setTimeout> | null = null
const editingOrg = ref<Organization | null>(null)
const editName = ref('')
const editDescription = ref('')
const deleteTarget = ref<Organization | null>(null)
const removeMemberTarget = ref<{ orgId: number; userId: number; username: string } | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  fetchOrganizations()
})

const handleSearch = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => setSearch(val), 300)
}

const handleCreate = async () => {
  if (!newOrgName.value.trim()) return
  const org = await createOrg({
    name: newOrgName.value.trim(),
    description: newOrgDescription.value.trim() || undefined,
  })
  if (org) {
    newOrgName.value = ''
    newOrgDescription.value = ''
    showCreateForm.value = false
  }
}

const handleStartEdit = (org: Organization) => {
  editingOrg.value = org
  editName.value = org.name
  editDescription.value = org.description || ''
}

const handleSaveEdit = async () => {
  if (!editingOrg.value || !editName.value.trim()) return
  const ok = await updateOrg(editingOrg.value.id, {
    name: editName.value.trim(),
    description: editDescription.value.trim() || undefined,
  })
  if (ok) editingOrg.value = null
}

const handleDeleteConfirm = async () => {
  if (deleteTarget.value) {
    await deleteOrg(deleteTarget.value.id)
    deleteTarget.value = null
  }
}

const handleAddMemberInput = () => {
  if (addMemberTimer) clearTimeout(addMemberTimer)
  if (!addMemberQuery.value.trim()) {
    addMemberResults.value = []
    return
  }
  addMemberTimer = setTimeout(async () => {
    try {
      addMemberResults.value = await usersApi.search(addMemberQuery.value, 10)
    } catch {
      addMemberResults.value = []
    }
  }, 300)
}

const handleAddMemberSelect = async (selectedUser: User) => {
  if (!selectedOrg.value) return
  addMemberQuery.value = ''
  addMemberResults.value = []
  await addMember(selectedOrg.value.id, selectedUser.id)
}

const handleRemoveMemberConfirm = async () => {
  if (removeMemberTarget.value) {
    await removeMember(removeMemberTarget.value.orgId, removeMemberTarget.value.userId)
    removeMemberTarget.value = null
  }
}

const getInitials = (name: string) => name.slice(0, 2).toUpperCase()
</script>

<template>
  <div class="card card-page glass-panel">
    <DemoBanner v-if="demoMode" />
    <!-- Header -->
    <header class="section">
      <div class="section-header-row">
        <div>
          <h3 class="section-title">{{ $t('org.title') }}</h3>
          <p class="section-subtitle">{{ $t('org.subtitle') }}</p>
        </div>
        <button
          v-if="!selectedOrg"
          class="btn btn-primary btn-sm"
          @click="showCreateForm = !showCreateForm"
        >
          {{ showCreateForm ? $t('common.cancel') : $t('org.createNew') }}
        </button>
        <button
          v-else
          class="btn btn-secondary btn-sm"
          @click="deselectOrg"
        >
          {{ $t('org.backToList') }}
        </button>
      </div>
    </header>

    <!-- Create form -->
    <section v-if="showCreateForm && !selectedOrg" class="section">
      <h4 class="form-label">{{ $t('org.createNew') }}</h4>
      <div class="form-group">
        <input
          v-model="newOrgName"
          class="input"
          :placeholder="$t('org.namePlaceholder')"
          maxlength="50"
          @keydown.enter.prevent="handleCreate"
        />
        <input
          v-model="newOrgDescription"
          class="input"
          :placeholder="$t('org.descriptionPlaceholder')"
          maxlength="200"
        />
        <button class="btn btn-primary btn-sm" :disabled="!newOrgName.trim()" @click="handleCreate">
          {{ $t('common.create') }}
        </button>
      </div>
    </section>

    <!-- Search (list view) -->
    <section v-if="!selectedOrg" class="section search-section">
      <input
        :value="searchQuery"
        class="input search-input"
        :placeholder="$t('org.searchPlaceholder')"
        @input="handleSearch"
      />
    </section>

    <!-- Error -->
    <div v-if="error" class="section error-section">
      <p class="error-text">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="section loading-section">
      <p class="text-tertiary">{{ $t('common.loading') }}</p>
    </div>

    <!-- Organization List -->
    <template v-if="!selectedOrg && !isLoading">
      <div v-if="organizations.length === 0" class="section empty-state">
        <p class="text-tertiary">{{ $t('org.noOrgs') }}</p>
        <p class="guidance-hint">Create your first organization to group teams and manage members.</p>
      </div>

      <div v-else class="org-list">
        <button
          v-for="org in organizations"
          :key="org.id"
          class="org-card"
          @click="selectOrg(org)"
        >
          <div class="org-avatar">{{ getInitials(org.name) }}</div>
          <div class="org-info">
            <span class="org-name">{{ org.name }}</span>
            <span class="org-meta">
              {{ org.memberCount }} {{ $t('org.members') }}
              <template v-if="org.ownerId === userId"> &middot; {{ $t('org.owner') }}</template>
            </span>
            <span v-if="org.description" class="org-desc">{{ org.description }}</span>
          </div>
          <span class="org-arrow">&rsaquo;</span>
        </button>
      </div>
    </template>

    <!-- Organization Detail -->
    <template v-if="selectedOrg">
      <!-- Edit form -->
      <section v-if="editingOrg" class="section">
        <h4 class="form-label">{{ $t('org.editOrg') }}</h4>
        <div class="form-group">
          <input v-model="editName" class="input" :placeholder="$t('org.namePlaceholder')" maxlength="50" />
          <input v-model="editDescription" class="input" :placeholder="$t('org.descriptionPlaceholder')" maxlength="200" />
          <div class="form-actions">
            <button class="btn btn-secondary btn-sm" @click="editingOrg = null">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary btn-sm" :disabled="!editName.trim()" @click="handleSaveEdit">{{ $t('common.save') }}</button>
          </div>
        </div>
      </section>

      <!-- Detail header -->
      <section v-else class="section detail-header">
        <div class="detail-title-row">
          <div class="org-avatar org-avatar-lg">{{ getInitials(selectedOrg.name) }}</div>
          <div>
            <h3 class="detail-name">{{ selectedOrg.name }}</h3>
            <p v-if="selectedOrg.description" class="detail-desc">{{ selectedOrg.description }}</p>
            <span class="detail-meta">
              {{ selectedOrg.memberCount }} {{ $t('org.members') }} &middot;
              {{ $t('org.role') }}: {{ currentUserRole || $t('org.nonMember') }}
            </span>
          </div>
        </div>
        <div v-if="canManage" class="detail-actions">
          <button class="btn btn-secondary btn-sm" @click="handleStartEdit(selectedOrg)">{{ $t('common.edit') }}</button>
          <button class="btn btn-danger btn-sm" @click="deleteTarget = selectedOrg">{{ $t('common.delete') }}</button>
        </div>
      </section>

      <!-- Add member -->
      <section v-if="canManage" class="section">
        <h4 class="form-label">{{ $t('org.addMember') }}</h4>
        <div class="add-member-search">
          <input
            v-model="addMemberQuery"
            class="input"
            :placeholder="$t('chat.searchUser')"
            autocomplete="off"
            @input="handleAddMemberInput"
          />
          <ul v-if="addMemberResults.length" class="add-member-results">
            <li
              v-for="u in addMemberResults"
              :key="u.id"
              class="add-member-result"
              @click="handleAddMemberSelect(u)"
            >
              <span class="result-username">{{ u.username }}</span>
              <span v-if="u.profile?.displayName" class="result-display">{{ u.profile.displayName }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Members list -->
      <section class="section">
        <h4 class="form-label">{{ $t('org.membersList') }} ({{ members.length }})</h4>
        <div v-if="isLoadingMembers" class="loading-section">
          <p class="text-tertiary">{{ $t('common.loading') }}</p>
        </div>
        <div v-else-if="members.length === 0" class="empty-state">
          <p class="text-tertiary">{{ $t('org.noMembers') }}</p>
        </div>
        <div v-else class="members-list">
          <div v-for="member in members" :key="member.id" class="member-row">
            <div class="member-avatar">{{ getInitials(member.user.username) }}</div>
            <div class="member-info">
              <span class="member-name">{{ member.user.username }}</span>
              <span class="member-role badge" :class="'badge-' + member.role">{{ member.role }}</span>
            </div>
            <button
              v-if="canManage && member.userId !== userId && member.role !== 'owner'"
              class="btn btn-ghost btn-sm remove-btn"
              @click="removeMemberTarget = { orgId: selectedOrg!.id, userId: member.userId, username: member.user.username }"
            >
              &times;
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- Confirm dialogs -->
    <ConfirmDialog
      v-if="deleteTarget"
      :title="$t('org.deleteOrg')"
      :message="$t('org.confirmDelete', { name: deleteTarget.name })"
      :danger="true"
      @confirm="handleDeleteConfirm"
      @cancel="deleteTarget = null"
    />

    <ConfirmDialog
      v-if="removeMemberTarget"
      :title="$t('org.removeMember')"
      :message="$t('org.confirmRemoveMember', { name: removeMemberTarget.username })"
      :danger="true"
      @confirm="handleRemoveMemberConfirm"
      @cancel="removeMemberTarget = null"
    />
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 720px;
}

.section {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.section:last-child {
  border-bottom: none;
}

.section-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-1) 0;
}

.section-subtitle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
}

.form-label {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-tertiary);
  margin: 0 0 var(--space-3) 0;
  text-transform: uppercase;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-row {
  display: flex;
  gap: var(--space-2);
}

.form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.search-section {
  padding-top: var(--space-3);
  padding-bottom: var(--space-3);
}

.search-input {
  width: 100%;
}

.error-section {
  padding: var(--space-3) var(--space-6);
}

.error-text {
  color: var(--color-error);
  font-size: var(--text-xs);
  margin: 0;
}

.loading-section {
  padding: var(--space-8);
  text-align: center;
}

.empty-state {
  padding: var(--space-8);
  text-align: center;
}

.guidance-hint {
  margin: var(--space-2) 0 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Org list */
.org-list {
  display: flex;
  flex-direction: column;
}

.org-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-6);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  transition: background var(--duration-fast) var(--ease-default);
  width: 100%;
}

.org-card:last-child {
  border-bottom: none;
}

.org-card:hover {
  background: var(--bg-hover);
}

.org-avatar {
  width: 40px;
  height: 40px;
  -webkit-clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.org-avatar-lg {
  width: 56px;
  height: 56px;
  font-size: var(--text-base);
}

.org-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.org-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.org-desc {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-arrow {
  color: var(--text-tertiary);
  font-size: var(--text-lg);
  flex-shrink: 0;
}

/* Detail */
.detail-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.detail-name {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-primary);
  margin: 0;
}

.detail-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: var(--space-1) 0 0 0;
}

.detail-meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.detail-actions {
  display: flex;
  gap: var(--space-2);
}

/* Members */
.members-list {
  display: flex;
  flex-direction: column;
}

.member-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.member-row:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 32px;
  height: 32px;
  -webkit-clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.member-name {
  font-size: var(--text-sm);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-role {
  font-size: 10px;
  padding: 2px var(--space-2);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}

.badge-owner {
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
}

.badge-admin {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge-member {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.remove-btn {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: var(--text-base);
}

.remove-btn:hover {
  color: var(--color-error);
}

/* Add member typeahead */
.add-member-search {
  position: relative;
}

.add-member-results {
  list-style: none;
  margin: var(--space-1) 0 0 0;
  padding: 0;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  max-height: 160px;
  overflow-y: auto;
}

.add-member-result {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-default);
}

.add-member-result:hover {
  background: var(--bg-hover);
}

.result-username {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.result-display {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .section {
    padding: var(--space-3) var(--space-4);
  }

  .section-header-row {
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    flex-direction: column;
  }

  .org-card {
    padding: var(--space-3) var(--space-4);
  }
}
</style>
