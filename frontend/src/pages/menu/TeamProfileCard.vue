<script setup lang="ts">
/**
 * Team profile (/menu/teams/:id): roster with captain and substitutes, the tournament, the
 * team's match results and where it finished. Reads GET /teams/:id/profile.
 */

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { teamsApi } from '../../api/teams'
import { getErrorMessage } from '../../utils/error'
import type { TeamProfile, TeamProfileMatch } from '../../types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const profile = ref<TeamProfile | null>(null)
const loading = ref(true)
const error = ref('')

const teamId = computed(() => Number(route.params.id) || null)

async function load() {
  if (!teamId.value) {
    error.value = t('teamProfile.notFound')
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    profile.value = await teamsApi.getProfile(teamId.value)
  } catch (e) {
    profile.value = null
    error.value = getErrorMessage(e, t('teamProfile.notFound'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(teamId, load)

const starters = computed(() => profile.value?.members.filter(m => !m.isSubstitute) ?? [])
const bench = computed(() => profile.value?.members.filter(m => m.isSubstitute) ?? [])

const placementText = computed(() => {
  const p = profile.value?.placement
  if (!p) return null
  switch (p.outcome) {
    case 'champion': return t('teamProfile.champion')
    case 'finalist': return t('teamProfile.finalist')
    case 'semifinalist': return t('teamProfile.semifinalist')
    case 'eliminated': return t('teamProfile.eliminated')
    case 'in_progress': return t('teamProfile.inProgress')
    default: return t('teamProfile.registered')
  }
})

function roundLabel(m: TeamProfileMatch): string {
  if (m.stage === 'group') return t('bracket.matchday', { n: m.round })
  const fromEnd = m.rounds - m.round + 1
  if (fromEnd === 1) return t('bracket.final')
  if (fromEnd === 2) return t('bracket.semiFinal')
  if (fromEnd === 3) return t('bracket.quarterFinal')
  return t('bracket.round', { n: m.round })
}

const scoreText = (m: TeamProfileMatch) => (m.score ? `${m.score.for} - ${m.score.against}` : '-')

const record = computed(() => {
  const played = profile.value?.matches.filter(m => m.result) ?? []
  return { wins: played.filter(m => m.result === 'W').length, losses: played.filter(m => m.result === 'L').length }
})
</script>

<template>
  <div class="card card-page glass-panel">
    <div class="card-header">
      <h2 class="card-title">{{ t('teamProfile.title') }}</h2>
      <span v-if="profile" class="hud-serial">{{ profile.name }}</span>
      <button class="back-link" @click="router.back()">{{ t('teamProfile.back') }}</button>
    </div>

    <div class="card-body">
      <div v-if="loading" class="tp-state" role="status">{{ t('common.loading') }}</div>
      <div v-else-if="error || !profile" class="tp-state" role="alert">{{ error || t('teamProfile.notFound') }}</div>

      <template v-else>
        <div class="tp-head">
          <div class="tp-head-main">
            <h3 class="tp-name">{{ profile.name }}</h3>
            <router-link
              v-if="profile.tournament"
              :to="`/menu/tournaments/${profile.tournament.id}`"
              class="tp-tournament"
            >{{ profile.tournament.name }}</router-link>
            <span class="tp-status" data-testid="team-status">{{ profile.status }}</span>
          </div>
          <div class="tp-readouts">
            <div v-if="profile.placement?.place" class="tp-readout" data-testid="placement">
              <span class="tp-readout-value num">{{ String(profile.placement.place).padStart(2, '0') }}</span>
              <span class="tp-readout-label">{{ placementText }}</span>
            </div>
            <div v-else-if="placementText" class="tp-readout" data-testid="placement">
              <span class="tp-readout-label">{{ placementText }}</span>
            </div>
            <div class="tp-readout">
              <span class="tp-readout-value num">{{ record.wins }}-{{ record.losses }}</span>
              <span class="tp-readout-label">{{ t('teamProfile.record') }}</span>
            </div>
          </div>
        </div>

        <section class="tp-section" :aria-label="t('teamProfile.roster')">
          <h4 class="tp-heading">
            {{ t('teamProfile.roster') }}
            <span class="tp-count num">{{ profile.members.length }} / {{ profile.teamSize }}</span>
          </h4>
          <ul class="tp-roster">
            <li v-for="m in starters" :key="m.id" class="tp-member">
              <span class="tp-member-name">{{ m.username }}</span>
              <span v-if="m.isCaptain" class="tp-tag tp-tag-captain">{{ t('teamProfile.captain') }}</span>
            </li>
            <li v-for="m in bench" :key="m.id" class="tp-member tp-member-sub">
              <span class="tp-member-name">{{ m.username }}</span>
              <span class="tp-tag tp-tag-sub">{{ t('teamProfile.sub') }}</span>
            </li>
          </ul>
        </section>

        <section class="tp-section" :aria-label="t('teamProfile.results')">
          <h4 class="tp-heading">{{ t('teamProfile.results') }}</h4>
          <p v-if="!profile.matches.length" class="tp-empty">{{ t('teamProfile.noMatches') }}</p>
          <table v-else class="tp-table">
            <thead>
              <tr>
                <th scope="col">{{ t('teamProfile.colRound') }}</th>
                <th scope="col">{{ t('teamProfile.colOpponent') }}</th>
                <th scope="col" class="num">{{ t('teamProfile.colScore') }}</th>
                <th scope="col" class="num">{{ t('teamProfile.colResult') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in profile.matches" :key="m.id" data-testid="match-row">
                <td>{{ roundLabel(m) }}</td>
                <td>
                  <router-link v-if="m.opponent" :to="`/menu/teams/${m.opponent.id}`" class="tp-link">
                    {{ m.opponent.name }}
                  </router-link>
                  <template v-else>{{ t('bracket.tbd') }}</template>
                </td>
                <td class="num">{{ scoreText(m) }}<span v-if="m.walkover" class="tp-wo"> {{ t('bracket.walkover') }}</span></td>
                <td class="num">
                  <span v-if="m.result" class="tp-result" :class="m.result === 'W' ? 'is-win' : 'is-loss'">{{ m.result }}</span>
                  <span v-else class="tp-pending">{{ t('teamProfile.pending') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 900px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0;
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.back-link {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
}

.card-body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.tp-state {
  padding: var(--space-8);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.tp-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.tp-head-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.tp-name {
  margin: 0;
  font-size: var(--t-head);
  line-height: var(--lead-head);
  font-weight: var(--font-heavy);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.tp-tournament {
  color: var(--accent-primary);
  text-decoration: none;
  font-family: var(--font-display);
  letter-spacing: var(--tracking-wide);
}

.tp-status {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  color: var(--text-tertiary);
}

.tp-readouts {
  display: flex;
  gap: var(--space-6);
}

.tp-readout {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.tp-readout-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--t-head);
  font-weight: var(--font-heavy);
  line-height: var(--lead-head);
  color: var(--accent-primary);
}

.tp-readout-label {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.tp-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tp-heading {
  margin: 0;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.tp-count {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.tp-roster {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: var(--space-2);
}

.tp-member {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: var(--hud-border) solid var(--border-default);
  min-width: 0;
}

.tp-member-sub {
  border-style: dashed;
  opacity: 0.85;
}

.tp-member-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tp-tag {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  padding: 0 var(--space-2);
  border: var(--hud-border) solid currentColor;
}

.tp-tag-captain {
  color: var(--accent-primary);
}

.tp-tag-sub {
  color: var(--text-tertiary);
}

.tp-empty {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.tp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.tp-table th {
  text-align: left;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: var(--track-micro);
  color: var(--text-tertiary);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.tp-table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.tp-table .num {
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.tp-link {
  color: var(--text-primary);
  text-decoration: none;
}

.tp-link:hover {
  color: var(--accent-primary);
  text-decoration: underline;
}

.tp-wo {
  font-size: var(--t-micro);
  color: var(--text-tertiary);
}

.tp-result {
  font-weight: var(--font-heavy);
}

.tp-result.is-win {
  color: var(--color-success);
}

.tp-result.is-loss {
  color: var(--color-error);
}

.tp-pending {
  color: var(--text-tertiary);
  font-size: var(--t-micro);
}

@media (max-width: 480px) {
  .card-header,
  .card-body {
    padding: var(--space-4);
  }
}
</style>
