<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { usersApi } from '../../api/users'
import { useErrorHandler } from '../../composables/useErrorHandler'
import ProfileSection from '../../components/user/ProfileSection.vue'
import SettingsSection from '../../components/user/SettingsSection.vue'
import SecuritySection from '../../components/user/SecuritySection.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
// Destructuring the store state directly would freeze `user` at its setup-time value
// (and make `user.value` undefined), so keep it reactive with storeToRefs.
const { user } = storeToRefs(authStore)
const { checkAuth, logout } = authStore

const showDeleteDialog = ref(false)
const isDeleting = ref(false)
/** The user types their username to arm the delete button. */
const deleteConfirmation = ref('')
const deleteArmed = computed(
  () => !!user.value && deleteConfirmation.value.trim() === user.value.username && !isDeleting.value,
)

const openDeleteDialog = () => {
  deleteConfirmation.value = ''
  showDeleteDialog.value = true
}
const { message: deleteError, handleError } = useErrorHandler()

const refreshUser = () => {
  checkAuth()
}

const handleDeleteAccount = async () => {
  if (!user.value || !deleteArmed.value) return
  isDeleting.value = true
  try {
    await usersApi.deleteAccount(user.value.id)
    await logout()
    router.push('/auth')
  } catch (error) {
    handleError(error, t('user.failedToDelete'))
    showDeleteDialog.value = false
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="card card-page glass-panel">
    <div v-if="!user" class="card-loading">
      <p class="text-secondary">{{ $t('user.loadingUserData') }}</p>
    </div>

    <template v-else>
      <ProfileSection :user="user" @updated="refreshUser" />
      <SettingsSection :user="user" @updated="refreshUser" />
      <SecuritySection />

      <!-- Danger zone -->
      <section class="section section-danger">
        <h3 class="section-title">{{ $t('user.dangerZone') }}</h3>
        <div class="danger-row">
          <div>
            <p class="danger-label">{{ $t('user.deleteAccount') }}</p>
            <p class="danger-hint">{{ $t('user.deleteAccountWarning') }}</p>
          </div>
          <button class="btn btn-danger btn-sm" @click="openDeleteDialog">
            {{ $t('common.delete') }}
          </button>
        </div>
        <p v-if="deleteError" class="alert alert-error" style="margin-top: var(--space-3);">
          {{ deleteError }}
        </p>
      </section>
    </template>

    <ConfirmDialog
      v-if="showDeleteDialog"
      :title="$t('user.deleteAccountConfirmTitle')"
      :message="$t('user.deleteAccountConfirmMessage')"
      :confirm-label="$t('user.deleteAccountConfirm')"
      :danger="true"
      :confirm-disabled="!deleteArmed"
      @confirm="handleDeleteAccount"
      @cancel="showDeleteDialog = false"
    >
      <div class="delete-details">
        <p class="delete-heading">{{ $t('user.deleteErasedTitle') }}</p>
        <ul class="delete-erased">
          <li>{{ $t('user.deleteErasedIdentity') }}</li>
          <li>{{ $t('user.deleteErasedSocial') }}</li>
          <li>{{ $t('user.deleteErasedTeams') }}</li>
          <li>{{ $t('user.deleteErasedAccess') }}</li>
        </ul>
        <p class="delete-heading">{{ $t('user.deleteKeptTitle') }}</p>
        <ul class="delete-kept">
          <li>{{ $t('user.deleteKeptMessages') }}</li>
          <li>{{ $t('user.deleteKeptResults') }}</li>
        </ul>
        <label class="delete-confirm-label" for="delete-confirm-input">
          {{ $t('user.deleteTypeUsername', { username: user?.username ?? '' }) }}
        </label>
        <input
          id="delete-confirm-input"
          v-model="deleteConfirmation"
          class="input delete-confirm-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.delete-details {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-4) 0;
}

.delete-heading {
  margin: var(--space-3) 0 var(--space-1) 0;
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.delete-details ul {
  margin: 0;
  padding-left: var(--space-4);
}

.delete-confirm-label {
  display: block;
  margin: var(--space-4) 0 var(--space-2) 0;
}

.delete-confirm-input {
  width: 100%;
}

.card-page {
  width: 100%;
  max-width: 720px;
}

.card-loading {
  padding: var(--space-8);
  text-align: center;
}

.section {
  padding: var(--space-6);
}

.section-danger {
  border-bottom: none;
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-4) 0;
}

.section-danger .section-title {
  color: var(--color-error);
}

.danger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.danger-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin: 0;
}

.danger-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: var(--space-1) 0 0 0;
}
</style>
