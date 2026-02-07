<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { usersApi } from '../../api/users'
import { ApiError } from '../../types'
import ProfileSection from '../../components/user/ProfileSection.vue'
import SettingsSection from '../../components/user/SettingsSection.vue'
import SecuritySection from '../../components/user/SecuritySection.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'

const router = useRouter()
const { user, checkAuth, logout } = useAuth()

const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')

const refreshUser = () => {
  checkAuth()
}

const handleDeleteAccount = async () => {
  if (!user.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await usersApi.deleteAccount(user.value.id)
    await logout()
    router.push('/auth')
  } catch (error) {
    deleteError.value = error instanceof ApiError ? error.message : 'Failed to delete account'
    showDeleteDialog.value = false
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="card card-page">
    <div v-if="!user" class="card-loading">
      <p class="text-secondary">Loading user data...</p>
    </div>

    <template v-else>
      <ProfileSection :user="user" @updated="refreshUser" />
      <SettingsSection :user="user" @updated="refreshUser" />
      <SecuritySection />

      <!-- Danger zone -->
      <section class="section section-danger">
        <h3 class="section-title">DANGER ZONE</h3>
        <div class="danger-row">
          <div>
            <p class="danger-label">Delete Account</p>
            <p class="danger-hint">This action cannot be undone.</p>
          </div>
          <button class="btn btn-danger btn-sm" @click="showDeleteDialog = true">
            DELETE
          </button>
        </div>
        <p v-if="deleteError" class="alert alert-error" style="margin-top: var(--space-3);">
          {{ deleteError }}
        </p>
      </section>
    </template>

    <ConfirmDialog
      v-if="showDeleteDialog"
      title="Delete Account"
      message="Are you sure you want to delete your account? All data will be permanently lost."
      confirm-label="DELETE ACCOUNT"
      :danger="true"
      @confirm="handleDeleteAccount"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<style scoped>
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
