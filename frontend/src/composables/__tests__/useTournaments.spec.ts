/**
 * useTournaments Composable Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTournaments } from '../useTournaments'
import { tournamentsApi } from '../../api/tournaments'
import { ApiError, TournamentStatus, PhaseType } from '../../types'
import type { BackendTournament } from '../../types'

vi.mock('../../api/tournaments', () => ({
  tournamentsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    register: vi.fn(),
  },
}))

const makeTournament = (overrides: Partial<BackendTournament> = {}): BackendTournament => ({
  id: 1,
  name: 'Spring Championship',
  description: 'Annual spring tournament',
  max_participants: 16,
  status: TournamentStatus.REGISTRATION_OPEN,
  phases: [
    {
      id: 1,
      tournament_id: 1,
      order: 1,
      type: PhaseType.SINGLE_ELIMINATION,
      game_id: 1,
      game: { id: 1, name: 'Chess' },
      matches: [],
    },
  ],
  teams: [],
  createdAt: '2026-02-01T00:00:00.000Z',
  ...overrides,
})

describe('useTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchTournaments', () => {
    it('should load tournaments list', async () => {
      const list = [makeTournament(), makeTournament({ id: 2, name: 'Winter Cup' })]
      vi.mocked(tournamentsApi.getAll).mockResolvedValue(list)

      const { tournaments, fetchTournaments, isLoading } = useTournaments()
      await fetchTournaments()

      expect(tournamentsApi.getAll).toHaveBeenCalledOnce()
      expect(tournaments.value).toEqual(list)
      expect(isLoading.value).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise!: (value: BackendTournament[]) => void
      vi.mocked(tournamentsApi.getAll).mockReturnValue(
        new Promise(resolve => { resolvePromise = resolve })
      )

      const { isLoading, fetchTournaments } = useTournaments()
      const promise = fetchTournaments()

      expect(isLoading.value).toBe(true)

      resolvePromise([])
      await promise

      expect(isLoading.value).toBe(false)
    })

    it('should handle API errors', async () => {
      vi.mocked(tournamentsApi.getAll).mockRejectedValue(new Error('Network error'))

      const { error, tournaments, fetchTournaments } = useTournaments()
      await fetchTournaments()

      expect(error.value).toBe('Failed to load tournaments')
      expect(tournaments.value).toEqual([])
    })

    it('should use ApiError message when available', async () => {
      vi.mocked(tournamentsApi.getAll).mockRejectedValue(
        new ApiError(403, 'FORBIDDEN', 'You do not have access')
      )

      const { error, fetchTournaments } = useTournaments()
      await fetchTournaments()

      expect(error.value).toBe('You do not have access')
    })

    it('should clear previous error on new fetch', async () => {
      vi.mocked(tournamentsApi.getAll)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce([])

      const { error, fetchTournaments } = useTournaments()
      await fetchTournaments()
      expect(error.value).toBeTruthy()

      await fetchTournaments()
      expect(error.value).toBe('')
    })
  })

  describe('fetchTournament', () => {
    it('should load a single tournament', async () => {
      const tournament = makeTournament({ id: 5 })
      vi.mocked(tournamentsApi.getById).mockResolvedValue(tournament)

      const { currentTournament, fetchTournament } = useTournaments()
      await fetchTournament(5)

      expect(tournamentsApi.getById).toHaveBeenCalledWith(5)
      expect(currentTournament.value).toEqual(tournament)
    })

    it('should set currentTournament to null on error', async () => {
      vi.mocked(tournamentsApi.getById).mockRejectedValue(new Error('not found'))

      const { currentTournament, error, fetchTournament } = useTournaments()
      await fetchTournament(999)

      expect(currentTournament.value).toBeNull()
      expect(error.value).toBe('Failed to load tournament')
    })

    it('should clear previous tournament on error', async () => {
      const tournament = makeTournament()
      vi.mocked(tournamentsApi.getById)
        .mockResolvedValueOnce(tournament)
        .mockRejectedValueOnce(new Error('fail'))

      const { currentTournament, fetchTournament } = useTournaments()
      await fetchTournament(1)
      expect(currentTournament.value).not.toBeNull()

      await fetchTournament(2)
      expect(currentTournament.value).toBeNull()
    })
  })

  describe('register', () => {
    it('should call register API and refresh tournament on success', async () => {
      const tournament = makeTournament()
      vi.mocked(tournamentsApi.register).mockResolvedValue(undefined)
      vi.mocked(tournamentsApi.getById).mockResolvedValue(tournament)

      const { register, currentTournament } = useTournaments()
      const result = await register(1, { teamName: 'My Team' })

      expect(result).toBe(true)
      expect(tournamentsApi.register).toHaveBeenCalledWith(1, { teamName: 'My Team' })
      expect(tournamentsApi.getById).toHaveBeenCalledWith(1)
      expect(currentTournament.value).toEqual(tournament)
    })

    it('should call register with no data', async () => {
      vi.mocked(tournamentsApi.register).mockResolvedValue(undefined)
      vi.mocked(tournamentsApi.getById).mockResolvedValue(makeTournament())

      const { register } = useTournaments()
      await register(1)

      expect(tournamentsApi.register).toHaveBeenCalledWith(1, undefined)
    })

    it('should return false and set error on registration failure', async () => {
      vi.mocked(tournamentsApi.register).mockRejectedValue(
        new ApiError(409, 'ALREADY_REGISTERED', 'Already registered')
      )

      const { register, error } = useTournaments()
      const result = await register(1)

      expect(result).toBe(false)
      expect(error.value).toBe('Already registered')
      // Should not have tried to refresh
      expect(tournamentsApi.getById).not.toHaveBeenCalled()
    })

    it('should return false with fallback message on generic error', async () => {
      vi.mocked(tournamentsApi.register).mockRejectedValue(new Error('oops'))

      const { register, error } = useTournaments()
      const result = await register(1)

      expect(result).toBe(false)
      expect(error.value).toBe('Failed to register for tournament')
    })
  })
})
