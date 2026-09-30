<script setup lang="ts">
/**
 * "Registration closes in 2d 4h" until the deadline, "Registration closed" after it.
 * Renders nothing when the tournament has no deadline.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNow } from '../../composables/useNow'
import { formatCountdown } from '../../utils/registration'

const props = defineProps<{
  /** ISO timestamp of the deadline, or null/undefined when there is none. */
  closesAt?: string | null
}>()

const { t } = useI18n()
const now = useNow()

const remaining = computed(() =>
  props.closesAt ? new Date(props.closesAt).getTime() - now.value : null,
)
const closed = computed(() => remaining.value !== null && remaining.value <= 0)
const text = computed(() => {
  if (remaining.value === null) return ''
  if (closed.value) return t('registration.closed')
  return t('registration.closesIn', {
    time: formatCountdown(remaining.value, {
      d: t('registration.units.d'),
      h: t('registration.units.h'),
      m: t('registration.units.m'),
      s: t('registration.units.s'),
    }),
  })
})
</script>

<template>
  <span
    v-if="closesAt"
    class="registration-countdown"
    :class="{ 'registration-countdown-closed': closed }"
    data-testid="registration-countdown"
    role="timer"
  >
    {{ text }}
  </span>
</template>

<style scoped>
.registration-countdown {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--accent-primary);
}

.registration-countdown-closed {
  color: var(--color-warning);
}
</style>
