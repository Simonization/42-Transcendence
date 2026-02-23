<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '../../api/users'
import { useThemeStore } from '../../stores/theme'
import { useErrorHandler } from '../../composables/useErrorHandler'
import MessageAlert from '../common/MessageAlert.vue'
import { SUPPORTED_LANGUAGES } from '../../types'
import type { User, SupportedLanguage } from '../../types'

const props = defineProps<{
  user: User
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t, locale } = useI18n()

const themeStore = useThemeStore()
const { toggleTheme, themeName } = themeStore
const { message, messageType, handleError, handleSuccess, clearMessage } = useErrorHandler()

const isSaving = ref(false)

const language = ref<SupportedLanguage>(props.user.settings?.language || 'en')
const openMessage = ref(props.user.settings?.openMessage ?? true)

watch(language, (newLang) => {
  locale.value = newLang
  localStorage.setItem('locale', newLang)
})

const languageLabels: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  tr: 'Türkçe',
  nl: 'Nederlands',
  ko: '한국어',
}

const saveSettings = async () => {
  isSaving.value = true
  clearMessage()
  try {
    await usersApi.updateSettings(props.user.id, {
      language: language.value,
      openMessage: openMessage.value,
    })
    handleSuccess(t('settings.settingsSaved'))
    emit('updated')
  } catch (error) {
    handleError(error, t('settings.failedToSave'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="section">
    <h3 class="section-title">{{ $t('settings.title') }}</h3>

    <div class="settings-grid">
      <div class="setting-row">
        <div class="setting-label">
          <label for="language-select" class="label-caps">{{ $t('settings.language') }}</label>
        </div>
        <select id="language-select" v-model="language" class="input setting-select">
          <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang" :value="lang">
            {{ languageLabels[lang] || lang }}
          </option>
        </select>
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <span class="label-caps">{{ $t('settings.theme') }}</span>
          <span class="setting-hint">{{ themeName }}</span>
        </div>
        <button class="btn btn-secondary btn-sm" @click="toggleTheme">{{ $t('common.toggle') }}</button>
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <span class="label-caps">{{ $t('settings.openMessages') }}</span>
          <span class="setting-hint">{{ $t('settings.openMessagesHint') }}</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="openMessage" />
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>

    <div class="section-actions">
      <button class="btn btn-primary btn-sm" @click="saveSettings" :disabled="isSaving">
        {{ isSaving ? $t('common.saving') : $t('settings.saveSettings') }}
      </button>
    </div>

    <MessageAlert :message="message" :type="messageType" :show="!!message" />
  </section>
</template>

<style scoped>
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.setting-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.setting-select {
  width: auto;
  min-width: 140px;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%);
  transition: all var(--duration-fast) var(--ease-default);
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--text-secondary);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  transition: all var(--duration-fast) var(--ease-default);
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary-subtle);
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-track::after {
  left: calc(100% - 20px);
  background: var(--accent-primary);
}

.section-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

</style>
