<script setup lang="ts">
/**
 * Tournament Brackets Page
 * Displays the tournament bracket visualization for the current/selected tournament
 */

import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import { useTournaments } from '../../composables/useTournaments'
import type { TournamentBracket, BracketRound } from '../../data/mockBracket'

const route = useRoute()
const { currentTournament, isLoading, fetchTournament } = useTournaments()

const tournamentId = computed(() => Number(route.params.id) || 1)

onMounted(() => fetchTournament(tournamentId.value))

const bracket = computed((): TournamentBracket | null => {
  const bt = currentTournament.value
  if (!bt?.phases?.length) return null

  const rounds: BracketRound[] = []
  for (const phase of bt.phases) {
    if (!phase.matches?.length) continue
    const roundMap = new Map<number, typeof phase.matches>()
    for (const m of phase.matches) {
      const arr = roundMap.get(m.round) ?? []
      arr.push(m)
      roundMap.set(m.round, arr)
    }
    for (const [roundNum, matches] of roundMap) {
      rounds.push({
        label: `ROUND ${roundNum}`,
        matches: matches.map((m, idx) => ({
          id: String(m.id),
          roundIndex: roundNum - 1,
          matchIndex: idx,
          player1: m.team1_id ? { id: String(m.team1_id), username: `Team ${m.team1_id}`, avatar: '👤', rating: 0, seed: 0 } : null,
          player2: m.team2_id ? { id: String(m.team2_id), username: `Team ${m.team2_id}`, avatar: '👤', rating: 0, seed: 0 } : null,
          score1: m.team1_score,
          score2: m.team2_score,
          status: m.status === 'completed' ? 'completed' as const : m.status === 'live' ? 'live' as const : 'upcoming' as const,
          winnerId: m.winner_id ? String(m.winner_id) : null,
          scheduledAt: m.scheduledAt ?? '',
          completedAt: m.completedAt,
        })),
      })
    }
  }

  return {
    tournamentId: String(bt.id),
    bracketType: bt.phases[0]?.type === 'DOUBLE_ELIMINATION' ? 'double-elimination' : bt.phases[0]?.type === 'ROUND_ROBIN' ? 'round-robin' : 'single-elimination',
    rounds,
    champion: null,
  }
})

const tournamentName = computed(() => currentTournament.value?.name ?? '')
</script>

<template>
  <div class="card card-page glass-panel">
    <div class="card-header">
      <h2 class="card-title">{{ $t('tournament.brackets') }}</h2>
      <span class="hud-serial">MODULE::ACTIVE</span>
    </div>

    <div class="card-body">
      <div v-if="isLoading" style="text-align: center; padding: var(--space-8); color: var(--text-tertiary);">
        {{ $t('common.loading') }}
      </div>
      <BracketVisualization v-else-if="bracket" :bracket="bracket" :tournament-name="tournamentName" />
      <div v-else style="text-align: center; padding: var(--space-8); color: var(--text-tertiary);">
        {{ $t('tournament.noBracketData') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 1200px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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
}

.card-body {
  padding: var(--space-6);
}
</style>
