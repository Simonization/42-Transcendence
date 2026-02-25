/**
 * Tournaments Composable
 * Manages tournament list and detail fetching from the backend API
 */

import { ref } from 'vue'
import { tournamentsApi } from '../api/tournaments'
import { getErrorMessage } from '../utils/error'
import type {
  BackendTournament,
  RegisterTournamentDto,
} from '../types'

export function useTournaments() {
  const tournaments = ref<BackendTournament[]>([])
  const currentTournament = ref<BackendTournament | null>(null)
  const isLoading = ref(false)
  const error = ref('')

  const fetchTournaments = async () => {
    isLoading.value = true
    error.value = ''
    try {
      tournaments.value = await tournamentsApi.getAll()
    } catch (e) {
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

  const register = async (id: number, data?: RegisterTournamentDto): Promise<boolean> => {
    error.value = ''
    try {
      await tournamentsApi.register(id, data)
      // Refresh tournament to get updated teams list
      await fetchTournament(id)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to register for tournament')
      return false
    }
  }

  return {
    tournaments,
    currentTournament,
    isLoading,
    error,
    fetchTournaments,
    fetchTournament,
    register,
  }
}
