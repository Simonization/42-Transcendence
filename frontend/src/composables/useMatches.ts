/**
 * Matches Composable
 * Manages match history state
 */

import { ref, computed } from 'vue'
import { matchesApi, transformMatch, computeStats } from '../api/matches'
import { getErrorMessage } from '../utils/error'
import type { Match } from '../types'

export function useMatches(currentUserId: number) {
  const matches = ref<Match[]>([])
  const isLoading = ref(false)
  const error = ref('')

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
      error.value = getErrorMessage(e, 'Failed to load match history')
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
    stats,
    uniqueGames,
    fetchMyHistory,
    fetchPlayerHistory,
  }
}
