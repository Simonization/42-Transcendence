/**
 * Tournaments Composable
 * Manages tournament list and detail fetching from the backend API
 */

import { ref } from 'vue'
import { tournamentsApi } from '../api/tournaments'
import { getErrorMessage } from '../utils/error'
import { TournamentStatus, PhaseType } from '../types'
import type {
  BackendTournament,
  RegisterTournamentDto,
} from '../types'

const DEMO_TOURNAMENTS: BackendTournament[] = [
  {
    id: 901, name: '42 Brussels Chess Championship', description: 'Annual chess tournament for 42 students',
    max_participants: 16, status: TournamentStatus.REGISTRATION_OPEN,
    phases: [{ id: 1, order: 1, type: PhaseType.SINGLE_ELIMINATION, game: { id: 1, name: 'Chess', teamCount: 2, teamSize: 1 }, matches: [] }],
    teams: [], createdAt: '2025-09-01T10:00:00Z',
  },
  {
    id: 902, name: '42 Pong Masters', description: 'Live pong competition — round-robin format',
    max_participants: 8, status: TournamentStatus.ONGOING,
    phases: [{ id: 2, order: 1, type: PhaseType.ROUND_ROBIN, game: { id: 2, name: 'Pong', teamCount: 2, teamSize: 1 }, matches: [] }],
    teams: [], createdAt: '2025-08-15T12:00:00Z',
  },
  {
    id: 903, name: '42 LAN Party Cup', description: 'Double-elimination LAN event',
    max_participants: 32, status: TournamentStatus.REGISTRATION_OPEN,
    phases: [{ id: 3, order: 1, type: PhaseType.DOUBLE_ELIMINATION, game: { id: 3, name: 'Custom IRL Game', teamCount: 2, teamSize: 4 }, matches: [] }],
    teams: [], createdAt: '2025-09-05T09:00:00Z',
  },
]

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
      tournaments.value = DEMO_TOURNAMENTS
      demoMode.value = true
      error.value = ''
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
    demoMode,
    fetchTournaments,
    fetchTournament,
    register,
  }
}
