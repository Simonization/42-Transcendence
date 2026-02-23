<script setup lang="ts">
import { onMounted } from 'vue'
import { useTwoFactor } from '../../composables/useTwoFactor'
import MessageAlert from '../common/MessageAlert.vue'

const {
  enabled,
  loading,
  message,
  showForm,
  code,
  isFetching,
  fetchStatus,
  enable,
  confirm,
  disable,
} = useTwoFactor()

onMounted(() => {
  fetchStatus()
})
</script>

<template>
  <section class="section">
    <h3 class="section-title">{{ $t('security.title') }}</h3>

    <div v-if="isFetching" class="loading-text">{{ $t('security.loading2fa') }}</div>

    <template v-else>
      <div class="security-row">
        <div class="security-info">
          <span class="label-caps">{{ $t('security.twoFactorAuth') }}</span>
          <span class="badge" :class="enabled ? 'badge-success' : 'badge-warning'">
            {{ enabled ? $t('common.enabled') : $t('common.disabled') }}
          </span>
        </div>

        <button
          v-if="!enabled && !showForm"
          class="btn btn-primary btn-sm"
          @click="enable"
          :disabled="loading"
        >
          {{ loading ? $t('security.sending') : $t('security.enable') }}
        </button>

        <button
          v-if="enabled"
          class="btn btn-danger btn-sm"
          @click="disable"
          :disabled="loading"
        >
          {{ loading ? $t('security.disabling') : $t('security.disable') }}
        </button>
      </div>

      <!-- Code confirmation form -->
      <div v-if="showForm" class="tfa-form">
        <p class="tfa-hint">{{ $t('security.codeSentHint') }}</p>
        <div class="tfa-input-row">
          <input
            v-model="code"
            type="text"
            class="input tfa-code"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            :aria-label="$t('security.codeLabel')"
            @input="code = code.replace(/[^0-9]/g, '')"
          />
          <button
            class="btn btn-primary btn-sm"
            @click="confirm"
            :disabled="loading || code.length !== 6"
          >
            {{ loading ? '...' : $t('common.confirm') }}
          </button>
        </div>
      </div>

      <MessageAlert :message="message" :type="message.startsWith('Error') ? 'error' : 'success'" :show="!!message" />
    </template>
  </section>
</template>

<style scoped>
.loading-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.security-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.tfa-form {
  margin-top: var(--space-4);
}

.tfa-hint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.tfa-input-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.tfa-code {
  width: 160px;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  text-align: center;
  letter-spacing: 0.3em;
}

</style>
