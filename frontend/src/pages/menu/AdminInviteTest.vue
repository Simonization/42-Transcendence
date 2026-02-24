<script setup lang="ts">

/* frontend test generate by AI for admin tokens */
import { ref } from 'vue'
import { api } from '../../api'
import { getErrorMessage } from '../../utils/error'

const createExpiresInHours = ref('24')
const bootstrapSecret = ref('')
const bootstrapExpiresInHours = ref('24')
const redeemToken = ref('')

const createResult = ref('')
const bootstrapResult = ref('')
const redeemResult = ref('')
const errorMessage = ref('')

const isCreating = ref(false)
const isBootstrapping = ref(false)
const isRedeeming = ref(false)

const parseHours = (value: string): number | undefined => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  if (parsed <= 0) return undefined
  return Math.round(parsed)
}

const createInvite = async () => {
  errorMessage.value = ''
  createResult.value = ''
  isCreating.value = true

  try {
    const expiresInHours = parseHours(createExpiresInHours.value)
    const response = await api<{ token: string; expiresAt: string }>('/auth/admin-invites', {
      method: 'POST',
      body: expiresInHours ? { expiresInHours } : {},
    })
    createResult.value = `Token: ${response.token}\nExpires: ${response.expiresAt}`
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Failed to create invite token')
  } finally {
    isCreating.value = false
  }
}

const bootstrapInvite = async () => {
  errorMessage.value = ''
  bootstrapResult.value = ''
  isBootstrapping.value = true

  try {
    const expiresInHours = parseHours(bootstrapExpiresInHours.value)
    const response = await api<{ token: string; expiresAt: string }>('/auth/admin-invites/bootstrap', {
      method: 'POST',
      body: {
        secret: bootstrapSecret.value,
        ...(expiresInHours ? { expiresInHours } : {}),
      },
      auth: false,
    })
    bootstrapResult.value = `Token: ${response.token}\nExpires: ${response.expiresAt}`
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Failed to bootstrap admin invite')
  } finally {
    isBootstrapping.value = false
  }
}

const redeemInvite = async () => {
  errorMessage.value = ''
  redeemResult.value = ''
  isRedeeming.value = true

  try {
    const response = await api<{ message: string }>('/auth/admin-invites/redeem', {
      method: 'POST',
      body: { token: redeemToken.value },
    })
    redeemResult.value = response.message
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Failed to redeem admin invite')
  } finally {
    isRedeeming.value = false
  }
}
</script>

<template>
  <div class="card card-page glass-panel">
    <header class="section">
      <h3 class="section-title">ADMIN INVITES TEST</h3>
      <p class="section-subtitle">Generate and redeem admin invite tokens.</p>
    </header>

    <section class="section">
      <h4 class="section-title">CREATE INVITE (ADMIN ONLY)</h4>
      <div class="field-row">
        <label class="field-label" for="create-hours">EXPIRES (HOURS)</label>
        <input
          id="create-hours"
          v-model="createExpiresInHours"
          class="field-input"
          type="number"
          min="1"
          max="168"
        />
      </div>
      <button class="btn btn-secondary btn-sm" :disabled="isCreating" @click="createInvite">
        {{ isCreating ? 'CREATING...' : 'CREATE TOKEN' }}
      </button>
      <pre v-if="createResult" class="result-box">{{ createResult }}</pre>
    </section>

    <section class="section">
      <h4 class="section-title">BOOTSTRAP INVITE (NO ADMIN YET)</h4>
      <div class="field-row">
        <label class="field-label" for="bootstrap-secret">BOOTSTRAP SECRET</label>
        <input
          id="bootstrap-secret"
          v-model="bootstrapSecret"
          class="field-input"
          type="password"
          autocomplete="off"
        />
      </div>
      <div class="field-row">
        <label class="field-label" for="bootstrap-hours">EXPIRES (HOURS)</label>
        <input
          id="bootstrap-hours"
          v-model="bootstrapExpiresInHours"
          class="field-input"
          type="number"
          min="1"
          max="168"
        />
      </div>
      <button class="btn btn-secondary btn-sm" :disabled="isBootstrapping" @click="bootstrapInvite">
        {{ isBootstrapping ? 'BOOTSTRAPPING...' : 'BOOTSTRAP TOKEN' }}
      </button>
      <pre v-if="bootstrapResult" class="result-box">{{ bootstrapResult }}</pre>
    </section>

    <section class="section section-last">
      <h4 class="section-title">REDEEM INVITE (LOGGED IN)</h4>
      <div class="field-row">
        <label class="field-label" for="redeem-token">INVITE TOKEN</label>
        <input
          id="redeem-token"
          v-model="redeemToken"
          class="field-input"
          type="text"
          autocomplete="off"
        />
      </div>
      <button class="btn btn-primary btn-sm" :disabled="isRedeeming" @click="redeemInvite">
        {{ isRedeeming ? 'REDEEMING...' : 'REDEEM TOKEN' }}
      </button>
      <p v-if="redeemResult" class="hint-text">{{ redeemResult }}</p>
    </section>

    <section v-if="errorMessage" class="section error-section">
      <p class="error-text">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 720px;
}

.section {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.section-last {
  border-bottom: none;
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.section-subtitle {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.field-label {
  font-size: var(--text-xxs);
  letter-spacing: var(--tracking-widest);
  color: var(--text-tertiary);
}

.field-input {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  border-radius: 4px;
}

.field-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.result-box {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: pre-wrap;
  word-break: break-all;
}

.hint-text {
  margin-top: var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.error-section {
  border-top: 1px solid var(--border-subtle);
}

.error-text {
  color: var(--color-error);
  font-size: var(--text-xs);
  margin: 0;
}
</style>
