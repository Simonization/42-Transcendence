<script setup lang="ts">
import { ref, computed } from 'vue'
import { usersApi } from '../../api/users'
import { ApiError } from '../../types'
import type { User } from '../../types'

const props = defineProps<{
  user: User
}>()

const emit = defineEmits<{
  updated: []
}>()

const isEditing = ref(false)
const isSaving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const displayName = ref(props.user.profile?.displayName || '')
const bio = ref(props.user.profile?.bio || '')

const initials = computed(() => {
  const name = props.user.profile?.displayName || props.user.username
  return name.slice(0, 2).toUpperCase()
})

const startEdit = () => {
  displayName.value = props.user.profile?.displayName || ''
  bio.value = props.user.profile?.bio || ''
  isEditing.value = true
  message.value = ''
}

const cancelEdit = () => {
  isEditing.value = false
  message.value = ''
}

const saveProfile = async () => {
  isSaving.value = true
  message.value = ''
  try {
    await usersApi.updateProfile(props.user.id, {
      displayName: displayName.value || undefined,
      bio: bio.value || undefined,
    })
    message.value = 'Profile updated'
    messageType.value = 'success'
    isEditing.value = false
    emit('updated')
  } catch (error) {
    messageType.value = 'error'
    message.value = error instanceof ApiError ? error.message : 'Failed to save'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="section">
    <h3 class="section-title">PROFILE</h3>

    <div class="profile-header">
      <div class="avatar">
        <img
          v-if="user.profile?.avatarUrl"
          :src="user.profile.avatarUrl"
          :alt="user.username"
          class="avatar-img"
        />
        <span v-else class="avatar-initials">{{ initials }}</span>
      </div>

      <div class="profile-info">
        <template v-if="!isEditing">
          <p class="profile-name">{{ user.profile?.displayName || user.username }}</p>
          <p class="profile-username">@{{ user.username }}</p>
          <p class="profile-email">{{ user.mail }}</p>
          <p v-if="user.profile?.bio" class="profile-bio">{{ user.profile.bio }}</p>
        </template>

        <template v-else>
          <div class="field">
            <label class="label-caps">DISPLAY NAME</label>
            <input v-model="displayName" class="input" placeholder="Display name" />
          </div>
          <div class="field">
            <label class="label-caps">BIO</label>
            <textarea v-model="bio" class="input textarea" placeholder="Short bio" rows="3"></textarea>
          </div>
        </template>
      </div>
    </div>

    <div class="section-actions">
      <template v-if="!isEditing">
        <button class="btn btn-secondary btn-sm" @click="startEdit">EDIT</button>
      </template>
      <template v-else>
        <button class="btn btn-ghost btn-sm" @click="cancelEdit">CANCEL</button>
        <button class="btn btn-primary btn-sm" @click="saveProfile" :disabled="isSaving">
          {{ isSaving ? 'SAVING...' : 'SAVE' }}
        </button>
      </template>
    </div>

    <Transition name="msg">
      <p v-if="message" class="section-message" :class="messageType === 'error' ? 'alert-error' : 'alert-success'">
        {{ message }}
      </p>
    </Transition>
  </section>
</template>

<style scoped>
.profile-header {
  display: flex;
  gap: var(--space-5);
  align-items: flex-start;
}

.avatar {
  width: 64px;
  height: 64px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
}

.profile-username {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.profile-email {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.profile-bio {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: var(--space-2) 0 0 0;
  line-height: var(--leading-relaxed);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.section-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.section-message {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  font-size: var(--text-xs);
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; }
</style>
