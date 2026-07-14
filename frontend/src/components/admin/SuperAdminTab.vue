<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { authApi } from '../../api/auth'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import MessageAlert from '../common/MessageAlert.vue'

const { t } = useI18n()
const authStore = useAuthStore()

interface AdminInfo {
  id: number
  username: string
  mail: string
  role: string
  createdAt: string
}

const admins = ref<AdminInfo[]>([])
const isLoading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// Invite generation
const generatedToken = ref('')
const tokenExpiry = ref('')
const expiresInHours = ref(24)
const isGenerating = ref(false)

// Revoke confirmation
const showRevokeConfirm = ref(false)
const revokeTargetId = ref<number | null>(null)
const revokeTargetName = ref('')

const fetchAdmins = async () => {
  isLoading.value = true
  try {
    const res = await authApi.listAdmins()
    admins.value = res.admins
  } catch {
    message.value = 'Failed to load admins'
    messageType.value = 'error'
  } finally {
    isLoading.value = false
  }
}

const handleRevoke = (admin: AdminInfo) => {
  revokeTargetId.value = admin.id
  revokeTargetName.value = admin.username
  showRevokeConfirm.value = true
}

const confirmRevoke = async () => {
  if (!revokeTargetId.value) return
  showRevokeConfirm.value = false
  try {
    await authApi.revokeAdmin(revokeTargetId.value)
    message.value = t('admin.adminRevoked')
    messageType.value = 'success'
    await fetchAdmins()
  } catch {
    message.value = 'Failed to revoke admin'
    messageType.value = 'error'
  }
  revokeTargetId.value = null
}

const generateInvite = async () => {
  isGenerating.value = true
  message.value = ''
  try {
    const res = await authApi.createAdminInvite(expiresInHours.value)
    generatedToken.value = res.token
    tokenExpiry.value = new Date(res.expiresAt).toLocaleString()
    message.value = t('admin.inviteGenerated')
    messageType.value = 'success'
  } catch {
    message.value = 'Failed to generate invite'
    messageType.value = 'error'
  } finally {
    isGenerating.value = false
  }
}

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(generatedToken.value)
    message.value = t('admin.tokenCopied')
    messageType.value = 'success'
  } catch {
    // Fallback
  }
}

onMounted(fetchAdmins)
</script>

<template>
  <div class="super-admin-tab">
    <h2 class="section-title">{{ $t('admin.superAdminTitle') }}</h2>

    <MessageAlert v-if="message" :message="message" :type="messageType" :show="!!message" />

    <div v-if="!authStore.isSuperAdmin" class="not-super-admin">
      <p class="not-super-admin-text">{{ $t('admin.superAdminOnly') }}</p>
    </div>

    <template v-else>
      <!-- Admin List -->
      <section class="admin-list-section">
        <h3 class="subsection-title">{{ $t('admin.adminList') }}</h3>

        <div v-if="isLoading" class="loading-state">
          {{ $t('common.loading') }}
        </div>

        <div v-else-if="admins.length === 0" class="empty-state-inline">
          {{ $t('admin.noAdmins') }}
        </div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>{{ $t('admin.username') }}</th>
              <th>{{ $t('admin.email') }}</th>
              <th>{{ $t('admin.role') }}</th>
              <th>{{ $t('admin.actionsCol') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in admins" :key="admin.id">
              <td>{{ admin.username }}</td>
              <td>{{ admin.mail }}</td>
              <td>
                <span
                  class="role-badge"
                  :class="admin.role === 'super_admin' ? 'role-super' : 'role-admin'"
                >
                  {{ admin.role === 'super_admin' ? $t('admin.superAdmin') : $t('admin.normalAdmin') }}
                </span>
              </td>
              <td>
                <button
                  v-if="admin.role !== 'super_admin' && admin.id !== authStore.user?.id"
                  class="action-link action-link-danger"
                  @click="handleRevoke(admin)"
                >
                  {{ $t('admin.revokeAdmin') }}
                </button>
                <span v-else class="action-link-disabled">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Generate Invite -->
      <section class="invite-section">
        <h3 class="subsection-title">{{ $t('admin.generateInvite') }}</h3>

        <div class="invite-form">
          <label class="invite-label">
            <span class="invite-label-text">{{ $t('admin.expiresInHours') }}</span>
            <input
              v-model.number="expiresInHours"
              type="number"
              min="1"
              max="720"
              class="invite-input"
            />
          </label>
          <button
            class="invite-btn"
            :disabled="isGenerating"
            @click="generateInvite"
          >
            {{ isGenerating ? $t('common.loading') : $t('admin.generateInvite') }}
          </button>
        </div>

        <div v-if="generatedToken" class="token-display">
          <div class="token-header">
            <span class="token-label">{{ $t('admin.inviteToken') }}</span>
            <span class="token-expiry">{{ $t('admin.inviteExpires') }}: {{ tokenExpiry }}</span>
          </div>
          <div class="token-value-row">
            <code class="token-value">{{ generatedToken }}</code>
            <button class="copy-btn" @click="copyToken">{{ $t('admin.copyToken') }}</button>
          </div>
        </div>
      </section>
    </template>

    <ConfirmDialog
      v-if="showRevokeConfirm"
      :title="$t('admin.revokeAdmin')"
      :message="$t('admin.confirmRevoke')"
      @confirm="confirmRevoke"
      @cancel="showRevokeConfirm = false"
    />
  </div>
</template>

<style scoped>
.super-admin-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.not-super-admin {
  padding: var(--space-8);
  text-align: center;
  background: var(--bg-tertiary);
  border: var(--hud-border) dashed var(--border-subtle);
}

.not-super-admin-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.subsection-title {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.admin-list-section,
.invite-section {
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state-inline {
  padding: var(--space-6);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.role-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
}

.role-super {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: var(--hud-border) solid var(--color-warning);
}

.role-admin {
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
  border: var(--hud-border) solid var(--accent-primary);
}

.action-link-danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-link-danger:hover {
  background: var(--color-error-bg);
}

.action-link-disabled {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.invite-form {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
}

.invite-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.invite-label-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.invite-input {
  width: 100px;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-default);
  color: var(--text-primary);
}

.invite-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.invite-btn {
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

.invite-btn:hover:not(:disabled) {
  background: var(--bg-selected);
}

.invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.token-display {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--accent-primary);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.token-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.token-expiry {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.token-value-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.token-value {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--accent-primary);
  word-break: break-all;
}

.copy-btn {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}

.copy-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}
</style>
