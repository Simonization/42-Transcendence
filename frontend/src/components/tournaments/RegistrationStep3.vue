<script setup lang="ts">
import type { FormData } from '../../composables/useRegistrationForm'

interface Props {
  formData: FormData
  errors: Record<string, string>
  rules: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:formData': [data: FormData]
}>()

const updateRulesAcceptance = (accepted: boolean) => {
  emit('update:formData', { ...props.formData, acceptRules: accepted })
}
</script>

<template>
  <section class="step-pane">
    <h3 class="step-title">Step 3 of 3: Accept Rules</h3>

    <div class="rules-container" role="region" aria-label="Tournament rules">
      <pre class="rules-text">{{ rules }}</pre>
    </div>

    <label class="checkbox-accept">
      <input
        id="accept-rules"
        :checked="formData.acceptRules"
        type="checkbox"
        required
        aria-required="true"
        :aria-invalid="!!errors.rules"
        :aria-describedby="errors.rules ? 'rules-error' : undefined"
        @change="updateRulesAcceptance($event.target.checked)"
      />
      <span class="checkbox-text">I accept the tournament rules *</span>
    </label>

    <span v-if="errors.rules" id="rules-error" role="alert" class="error-message">
      {{ errors.rules }}
    </span>
  </section>
</template>

<style scoped>
.step-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.step-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.rules-container {
  max-height: 300px;
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  margin-bottom: var(--space-4);
}

.rules-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.checkbox-accept {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  cursor: pointer;
}

.checkbox-accept input {
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.checkbox-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.error-message {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-error);
  padding: var(--space-2) var(--space-3);
  background: var(--color-error-bg);
  border-left: 2px solid var(--color-error);
}
</style>
