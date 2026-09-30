<script setup lang="ts">
/**
 * Podium of a completed tournament: 1st, 2nd and the semi-final losers sharing 3rd (there is no
 * third-place match). Renders nothing until the backend serves a podium, i.e. until COMPLETED.
 * Team names link to their profile when `linkTeams` is on (logged-in pages only).
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Podium, PodiumTeam } from '../../types'

const props = defineProps<{
  podium?: Podium | null
  linkTeams?: boolean
}>()

const { t } = useI18n()
const router = useRouter()

const teamHref = (teamId: number) => `/menu/teams/${teamId}`
const openTeam = (teamId: number) => router?.push(teamHref(teamId))

interface Step {
  place: 1 | 2 | 3
  label: string
  teams: PodiumTeam[]
}

const steps = computed<Step[]>(() => {
  const p = props.podium
  if (!p) return []
  return [
    { place: 1, label: t('podium.first'), teams: [p.first] },
    ...(p.second ? [{ place: 2 as const, label: t('podium.second'), teams: [p.second] }] : []),
    ...(p.third.length ? [{ place: 3 as const, label: t('podium.third'), teams: p.third }] : []),
  ]
})
</script>

<template>
  <section v-if="podium" class="podium" :aria-label="t('podium.title')" data-testid="podium">
    <h3 class="podium-title">{{ t('podium.title') }}</h3>
    <ol class="podium-steps">
      <li v-for="step in steps" :key="step.place" class="podium-step" :class="`place-${step.place}`">
        <span class="podium-place num">{{ String(step.place).padStart(2, '0') }}</span>
        <div class="podium-body">
          <span class="podium-label">{{ step.label }}</span>
          <span v-for="team in step.teams" :key="team.teamId" class="podium-team">
            <a
              v-if="linkTeams"
              :href="teamHref(team.teamId)"
              class="podium-link"
              @click.prevent="openTeam(team.teamId)"
            >{{ team.name }}</a>
            <template v-else>{{ team.name }}</template>
          </span>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.podium {
  margin-bottom: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-default);
}

.podium-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  color: var(--text-secondary);
  text-transform: uppercase;
}

.podium-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: var(--space-3);
}

.podium-step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-left: var(--hud-border-thick) solid var(--border-default);
  min-width: 0;
}

.podium-step.place-1 {
  border-left-color: var(--accent-primary);
}

.podium-place {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--t-head);
  font-weight: var(--font-heavy);
  line-height: var(--lead-head);
  color: var(--text-tertiary);
}

.place-1 .podium-place {
  color: var(--accent-primary);
}

.podium-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.podium-label {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.podium-team {
  font-family: var(--font-display);
  font-weight: var(--font-heavy);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.podium-link {
  color: inherit;
  text-decoration: none;
}

.podium-link:hover,
.podium-link:focus-visible {
  color: var(--accent-primary);
  text-decoration: underline;
}
</style>
