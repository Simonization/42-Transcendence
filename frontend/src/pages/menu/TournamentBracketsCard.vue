<script setup lang="ts">
/**
 * Tournament Brackets Page
 * Displays the tournament bracket visualization for the current/selected tournament
 */

import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import { useTournaments } from '../../composables/useTournaments'
import type { TournamentBracket, BracketRound } from '../../data/mockBracket'

const route = useRoute()
const router = useRouter()
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
      <div v-else class="bracket-guidance">
        <div class="guidance-icon">&#127942;</div>
        <h3 class="guidance-title">{{ $t('tournament.noBracketData') }}</h3>
        <p class="guidance-text">
          To view a bracket, first create a tournament (Admin &gt; Create), register teams, and start the tournament.
        </p>
        <button class="guidance-btn" @click="router.push('/menu/admin')">
          Go to Admin
        </button>
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

.bracket-guidance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  text-align: center;
}

.guidance-icon {
  font-size: var(--text-4xl);
  opacity: 0.6;
}

.guidance-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
}

.guidance-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  max-width: 400px;
  line-height: 1.5;
}

.guidance-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.guidance-btn:hover {
  background: var(--bg-selected);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}
</style>
