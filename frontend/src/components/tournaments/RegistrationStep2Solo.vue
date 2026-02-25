<script setup lang="ts">
import type { FormData } from '../../composables/useRegistrationForm'

interface Props {
  formData: FormData
  errors: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:formData': [data: FormData]
}>()

const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
  emit('update:formData', { ...props.formData, [field]: value })
}
</script>

<template>
  <section class="step-pane">
    <h3 class="step-title">Step 2 of 3: Confirm Details</h3>

    <div class="form-group">
      <label for="display-name" class="form-label">Display Name *</label>
      <input
        id="display-name"
        :value="formData.displayName"
        type="text"
        class="form-input"
        placeholder="Your display name"
        required
        aria-required="true"
        :aria-invalid="!!errors.displayName"
        :aria-describedby="errors.displayName ? 'display-name-error' : undefined"
        @input="updateField('displayName', $event.target.value)"
      />
      <span v-if="errors.displayName" id="display-name-error" role="alert" class="error-message">
        {{ errors.displayName }}
      </span>
    </div>

    <div class="form-group">
      <label for="email" class="form-label">Email *</label>
      <input
        id="email"
        :value="formData.email"
        type="email"
        class="form-input"
        placeholder="your@email.com"
        required
        aria-required="true"
        :aria-invalid="!!errors.email"
        :aria-describedby="errors.email ? 'email-error' : undefined"
        @input="updateField('email', $event.target.value)"
      />
      <span v-if="errors.email" id="email-error" role="alert" class="error-message">
        {{ errors.email }}
      </span>
    </div>

    <div class="form-group">
      <label for="in-game-username" class="form-label">In-Game Username *</label>
      <input
        id="in-game-username"
        :value="formData.inGameUsername"
        type="text"
        class="form-input"
        placeholder="Your in-game username"
        required
        aria-required="true"
        :aria-invalid="!!errors.inGameUsername"
        :aria-describedby="errors.inGameUsername ? 'in-game-username-error' : undefined"
        @input="updateField('inGameUsername', $event.target.value)"
      />
      <span v-if="errors.inGameUsername" id="in-game-username-error" role="alert" class="error-message">
        {{ errors.inGameUsername }}
      </span>
    </div>
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
  text-transform: uppercase;
}

.form-input {
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
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
