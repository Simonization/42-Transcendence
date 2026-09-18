/**
 * Tournaments Composable
 * Manages tournament list and detail fetching from the backend API
 */

import { ref } from 'vue'
import { tournamentsApi } from '../api/tournaments'
import { getErrorMessage } from '../utils/error'
import type { BackendTournament } from '../types'

export function useTournaments() {
  const tournaments = ref<BackendTournament[]>([])
  const currentTournament = ref<BackendTournament | null>(null)
  const isLoading = ref(false)
  const error = ref('')
  const demoMode = ref(false)

  const fetchTournaments = async () => {
    isLoading.value = true
    error.value = ''
    try {
      tournaments.value = await tournamentsApi.getAll()
    } catch (e) {
      tournaments.value = []
      demoMode.value = true
      error.value = getErrorMessage(e, 'Failed to load tournaments')
    } finally {
      isLoading.value = false
    }
  }

  const fetchTournament = async (id: number) => {
    isLoading.value = true
    error.value = ''
    try {
      currentTournament.value = await tournamentsApi.getById(id)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load tournament')
      currentTournament.value = null
    } finally {
      isLoading.value = false
    }
  }

  /** Freezes the field and generates phase 1's matches. Admin only. */
  const startTournament = async (id: number): Promise<boolean> => {
    error.value = ''
    try {
      await tournamentsApi.start(id)
      await fetchTournament(id)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to start tournament')
      return false
    }
  }

  return {
    tournaments,
    currentTournament,
    isLoading,
    error,
    demoMode,
    fetchTournaments,
    fetchTournament,
    startTournament,
  }
}
