<script setup lang="ts">
/**
 * The three dates of a tournament: start, registration deadline, check-in opening.
 * Used by the create form and the edit row (same v-model, PATCH accepts the same snake_case
 * fields). Shows the ordering error the backend would also return. Both forms can be in the DOM
 * at once, so the edit row passes its own `idPrefix` to keep the label targets unique.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { scheduleOrderError, type ScheduleValues } from '../../utils/registration'

const props = withDefaults(defineProps<{ modelValue: ScheduleValues; idPrefix?: string }>(), { idPrefix: 't' })
const emit = defineEmits<{ 'update:modelValue': [value: ScheduleValues] }>()

const { t } = useI18n()

function update(key: keyof ScheduleValues, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const orderError = computed(() => scheduleOrderError(props.modelValue))
</script>

<template>
  <div class="schedule-fields">
    <div class="form-group">
      <label :for="`${idPrefix}-scheduled`" class="form-label">{{ t('admin.scheduledAt') }}</label>
      <input
        :id="`${idPrefix}-scheduled`"
        :value="modelValue.scheduledAt"
        type="datetime-local"
        class="form-input form-input-datetime"
        @input="update('scheduledAt', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="form-group">
      <label :for="`${idPrefix}-closes`" class="form-label">{{ t('registration.closesAtLabel') }}</label>
      <input
        :id="`${idPrefix}-closes`"
        :value="modelValue.registrationClosesAt"
        type="datetime-local"
        class="form-input form-input-datetime"
        :max="modelValue.scheduledAt || undefined"
        :aria-invalid="orderError === 'registrationClosesAt'"
        @input="update('registrationClosesAt', ($event.target as HTMLInputElement).value)"
      />
      <p v-if="orderError === 'registrationClosesAt'" class="schedule-error" role="alert">
        {{ t('registration.deadlineAfterStart') }}
      </p>
    </div>

    <div class="form-group">
      <label :for="`${idPrefix}-checkin`" class="form-label">{{ t('checkin.opensAtLabel') }}</label>
      <input
        :id="`${idPrefix}-checkin`"
        :value="modelValue.checkinOpensAt"
        type="datetime-local"
        class="form-input form-input-datetime"
        :max="modelValue.scheduledAt || undefined"
        :aria-invalid="orderError === 'checkinOpensAt'"
        @input="update('checkinOpensAt', ($event.target as HTMLInputElement).value)"
      />
      <p class="schedule-hint">{{ t('checkin.opensAtFieldHint') }}</p>
      <p v-if="orderError === 'checkinOpensAt'" class="schedule-error" role="alert">
        {{ t('checkin.opensAfterStart') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.schedule-fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
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
  transition: border-color var(--duration-fast) var(--ease-default);
}

.form-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

.form-input-datetime {
  max-width: 260px;
  color-scheme: dark;
}

.schedule-hint {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.schedule-error {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--color-error, var(--color-warning));
}
</style>
