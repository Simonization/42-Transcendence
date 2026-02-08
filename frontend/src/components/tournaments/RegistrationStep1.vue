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

const updateParticipationType = (type: 'solo' | 'team') => {
  emit('update:formData', { ...props.formData, participationType: type })
}
</script>

<template>
  <section class="step-pane">
    <fieldset>
      <legend class="step-title">Step 1 of 3: Choose Participation Type</legend>

      <div class="radio-group">
        <label class="radio-option">
          <input
            :checked="formData.participationType === 'solo'"
            type="radio"
            name="participation-type"
            value="solo"
            aria-describedby="solo-description"
            @change="updateParticipationType('solo')"
          />
          <span class="radio-label">Solo Registration</span>
          <span id="solo-description" class="radio-description">Register as an individual player</span>
        </label>

        <label class="radio-option">
          <input
            :checked="formData.participationType === 'team'"
            type="radio"
            name="participation-type"
            value="team"
            aria-describedby="team-description"
            @change="updateParticipationType('team')"
          />
          <span class="radio-label">Team Registration</span>
          <span id="team-description" class="radio-description">Register as a team (up to 4 players)</span>
        </label>
      </div>
    </fieldset>

    <div v-if="errors.type" class="error-message">
      {{ errors.type }}
    </div>
  </section>
</template>

<style scoped>
.step-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

legend {
  padding: 0;
  margin: 0;
}

.step-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.radio-option:hover {
  background: var(--bg-selected);
  border-color: var(--accent-primary-subtle);
}

.radio-option input {
  margin-top: var(--space-1);
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.radio-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.radio-description {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
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
