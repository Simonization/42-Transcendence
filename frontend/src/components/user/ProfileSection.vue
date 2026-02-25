<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '../../api/users'
import { useErrorHandler } from '../../composables/useErrorHandler'
import { useFormValidation } from '../../composables/useFormValidation'
import MessageAlert from '../common/MessageAlert.vue'
import defaultAvatarUrl from '../../assets/default-avatar.svg'
import type { User } from '../../types'

const props = defineProps<{
  user: User
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()

const isEditing = ref(false)
const isSaving = ref(false)
const { message, messageType, handleError, handleSuccess, clearMessage } = useErrorHandler()
const { validate, errors } = useFormValidation()

const displayName = ref(props.user.profile?.displayName || '')
const bio = ref(props.user.profile?.bio || '')
const avatarPreview = ref<string | null>(null)
const pendingAvatarBase64 = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const initials = computed(() => {
  const name = props.user.profile?.displayName || props.user.username
  return name.slice(0, 2).toUpperCase()
})

const currentAvatarSrc = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  if (props.user.profile?.avatarUrl) return props.user.profile.avatarUrl
  return null
})

const startEdit = () => {
  displayName.value = props.user.profile?.displayName || ''
  bio.value = props.user.profile?.bio || ''
  avatarPreview.value = null
  pendingAvatarBase64.value = null
  isEditing.value = true
  clearMessage()
}

const cancelEdit = () => {
  isEditing.value = false
  avatarPreview.value = null
  pendingAvatarBase64.value = null
  clearMessage()
}

const triggerFileInput = () => {
  if (isEditing.value) fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')!

      // Center-crop to square
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2

      ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      avatarPreview.value = base64
      pendingAvatarBase64.value = base64
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
  // Reset so the same file can be selected again
  input.value = ''
}

const saveProfile = async () => {
  isSaving.value = true
  clearMessage()

  // Validate inputs
  const displayNameValid = validate(displayName.value, ['sanitize'], 'displayName')
  const bioValid = validate(bio.value, ['sanitize'], 'bio')

  if (!displayNameValid || !bioValid) {
    isSaving.value = false
    return
  }

  try {
    await usersApi.updateProfile(props.user.id, {
      displayName: displayName.value || undefined,
      bio: bio.value || undefined,
      avatarUrl: pendingAvatarBase64.value || undefined,
    })
    handleSuccess(t('profile.profileUpdated'))
    isEditing.value = false
    avatarPreview.value = null
    pendingAvatarBase64.value = null
    emit('updated')
  } catch (error) {
    handleError(error, t('profile.failedToSave'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="section">
    <h3 class="section-title">{{ $t('profile.title') }}</h3>

    <div class="profile-header">
      <div
        class="avatar"
        :class="{ 'avatar-editable': isEditing }"
        @click="triggerFileInput"
      >
        <img
          v-if="currentAvatarSrc"
          :src="currentAvatarSrc"
          :alt="user.username"
          class="avatar-img"
        />
        <img
          v-else
          :src="defaultAvatarUrl"
          :alt="user.username"
          class="avatar-img avatar-default"
        />
        <div v-if="isEditing" class="avatar-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="file-input-hidden"
        @change="handleFileSelect"
      />

      <div class="profile-info">
        <template v-if="!isEditing">
          <p class="profile-name">{{ user.profile?.displayName || user.username }}</p>
          <p class="profile-username">@{{ user.username }}</p>
          <p class="profile-email">{{ user.mail }}</p>
          <p v-if="user.profile?.bio" class="profile-bio">{{ user.profile.bio }}</p>
        </template>

        <template v-else>
          <div class="field">
            <label for="display-name" class="label-caps">{{ $t('profile.displayName') }}</label>
            <input
              id="display-name"
              v-model="displayName"
              class="input"
              :class="{ 'input-error': errors.displayName }"
              :placeholder="$t('profile.displayNamePlaceholder')"
              @blur="validate(displayName, ['sanitize'], 'displayName')"
              :aria-invalid="!!errors.displayName"
              :aria-describedby="errors.displayName ? 'displayName-error' : undefined"
            />
            <span v-if="errors.displayName" id="displayName-error" class="field-error">{{ errors.displayName }}</span>
          </div>
          <div class="field">
            <label for="bio" class="label-caps">{{ $t('profile.bio') }}</label>
            <textarea
              id="bio"
              v-model="bio"
              class="input textarea"
              :class="{ 'input-error': errors.bio }"
              :placeholder="$t('profile.bioPlaceholder')"
              rows="3"
              @blur="validate(bio, ['sanitize'], 'bio')"
              :aria-invalid="!!errors.bio"
              :aria-describedby="errors.bio ? 'bio-error' : undefined"
            ></textarea>
            <span v-if="errors.bio" id="bio-error" class="field-error">{{ errors.bio }}</span>
          </div>
        </template>
      </div>
    </div>

    <div class="section-actions">
      <template v-if="!isEditing">
        <button class="btn btn-secondary btn-sm" @click="startEdit">{{ $t('common.edit') }}</button>
      </template>
      <template v-else>
        <button class="btn btn-ghost btn-sm" @click="cancelEdit">{{ $t('common.cancel') }}</button>
        <button class="btn btn-primary btn-sm" @click="saveProfile" :disabled="isSaving">
          {{ isSaving ? $t('common.saving') : $t('common.save') }}
        </button>
      </template>
    </div>

    <MessageAlert :message="message" :type="messageType" :show="!!message" />
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
  -webkit-clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.avatar-editable {
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  padding: 15%;
  opacity: 0.5;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.avatar-editable:hover .avatar-overlay {
  opacity: 1;
}

.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
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

.input-error {
  border-color: var(--color-error);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.1);
}

.field-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-error);
  margin-top: var(--space-1);
  padding: 0 var(--space-2);
}

.section-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

</style>
