/**
 * Matches Composable
 * Manages match history state
 */

import { ref, computed } from 'vue'
import { matchesApi, transformMatch, computeStats } from '../api/matches'
import { getErrorMessage } from '../utils/error'
import type { Match } from '../types'

const DEMO_MATCHES: Match[] = [
  { id: 901, opponent: 'alice42', game: 'Chess', result: 'win', date: '2025-09-10T14:00:00Z' },
  { id: 902, opponent: 'bob_dev', game: 'Chess', result: 'loss', date: '2025-09-09T11:00:00Z' },
  { id: 903, opponent: 'charlie_pong', game: 'Chess', result: 'win', date: '2025-09-08T16:00:00Z' },
  { id: 904, opponent: 'diana_chess', game: 'Chess', result: 'draw', date: '2025-09-07T10:00:00Z' },
  { id: 905, opponent: 'alice42', game: 'Chess', result: 'win', date: '2025-09-06T15:00:00Z' },
  { id: 906, opponent: 'bob_dev', game: 'Chess', result: 'loss', date: '2025-09-05T13:00:00Z' },
]

export function useMatches(currentUserId: number) {
  const matches = ref<Match[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const demoMode = ref(false)

  const stats = computed(() => computeStats(matches.value))

  const uniqueGames = computed(() => {
    const games = new Set(matches.value.map(m => m.game))
    return Array.from(games)
  })

  const fetchMyHistory = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const raw = await matchesApi.getMyHistory()
      matches.value = raw
        .map(m => transformMatch(m, currentUserId))
        .filter((m): m is Match => m !== null)
    } catch (e) {
      matches.value = DEMO_MATCHES
      demoMode.value = true
      error.value = ''
    } finally {
      isLoading.value = false
    }
  }

  const fetchPlayerHistory = async (userId: number) => {
    isLoading.value = true
    error.value = ''
    try {
      const raw = await matchesApi.getPlayerHistory(userId)
      matches.value = raw
        .map(m => transformMatch(m, userId))
        .filter((m): m is Match => m !== null)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load match history')
    } finally {
      isLoading.value = false
    }
  }

  return {
    matches,
    isLoading,
    error,
    demoMode,
    stats,
    uniqueGames,
    fetchMyHistory,
    fetchPlayerHistory,
  }
}
