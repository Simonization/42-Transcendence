<script setup lang="ts">
import { onMounted } from 'vue'
import { useTwoFactor } from '../../composables/useTwoFactor'

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
    <h3 class="section-title">SECURITY</h3>

    <div v-if="isFetching" class="loading-text">Loading 2FA status...</div>

    <template v-else>
      <div class="security-row">
        <div class="security-info">
          <span class="label-caps">TWO-FACTOR AUTH</span>
          <span class="badge" :class="enabled ? 'badge-success' : 'badge-warning'">
            {{ enabled ? 'ENABLED' : 'DISABLED' }}
          </span>
        </div>

        <button
          v-if="!enabled && !showForm"
          class="btn btn-primary btn-sm"
          @click="enable"
          :disabled="loading"
        >
          {{ loading ? 'SENDING...' : 'ENABLE' }}
        </button>

        <button
          v-if="enabled"
          class="btn btn-danger btn-sm"
          @click="disable"
          :disabled="loading"
        >
          {{ loading ? 'DISABLING...' : 'DISABLE' }}
        </button>
      </div>

      <!-- Code confirmation form -->
      <div v-if="showForm" class="tfa-form">
        <p class="tfa-hint">A code has been sent to your email. Enter it below.</p>
        <div class="tfa-input-row">
          <input
            v-model="code"
            type="text"
            class="input tfa-code"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            @input="code = code.replace(/[^0-9]/g, '')"
          />
          <button
            class="btn btn-primary btn-sm"
            @click="confirm"
            :disabled="loading || code.length !== 6"
          >
            {{ loading ? '...' : 'CONFIRM' }}
          </button>
        </div>
      </div>

      <Transition name="msg">
        <p
          v-if="message"
          class="section-message"
          :class="message.startsWith('Error') ? 'alert-error' : 'alert-success'"
        >
          {{ message }}
        </p>
      </Transition>
    </template>
  </section>
</template>

<style scoped>
.section {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-4) 0;
}

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

.section-message {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; }
</style>
