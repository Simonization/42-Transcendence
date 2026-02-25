/**
 * Tournaments API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tournamentsApi } from '../tournaments'
import * as apiModule from '../index'
import type { BackendTournament } from '../../types'
import { TournamentStatus, PhaseType } from '../../types'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

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

describe('Tournaments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tournamentsApi.getAll', () => {
    it('should call GET /tournaments', async () => {
      const tournaments = [makeTournament()]
      mockApi.mockResolvedValueOnce(tournaments)

      const result = await tournamentsApi.getAll()

      expect(mockApi).toHaveBeenCalledWith('/tournaments')
      expect(result).toEqual(tournaments)
    })

    it('should return empty array when no tournaments exist', async () => {
      mockApi.mockResolvedValueOnce([])

      const result = await tournamentsApi.getAll()

      expect(result).toEqual([])
    })
  })

  describe('tournamentsApi.getById', () => {
    it('should call GET /tournaments/:id', async () => {
      const tournament = makeTournament({ id: 5 })
      mockApi.mockResolvedValueOnce(tournament)

      const result = await tournamentsApi.getById(5)

      expect(mockApi).toHaveBeenCalledWith('/tournaments/5')
      expect(result).toEqual(tournament)
    })
  })

  describe('tournamentsApi.create', () => {
    it('should call POST /tournaments with data', async () => {
      const created = makeTournament()
      mockApi.mockResolvedValueOnce(created)

      const dto = {
        name: 'Spring Championship',
        description: 'Annual spring tournament',
        max_participants: 16,
        phases: [{ order: 1, type: PhaseType.SINGLE_ELIMINATION, game_id: 1 }],
      }

      const result = await tournamentsApi.create(dto)

      expect(mockApi).toHaveBeenCalledWith('/tournaments', {
        method: 'POST',
        body: dto,
      })
      expect(result).toEqual(created)
    })
  })

  describe('tournamentsApi.update', () => {
    it('should call PATCH /tournaments/:id with data', async () => {
      const updated = makeTournament({ name: 'Updated Name' })
      mockApi.mockResolvedValueOnce(updated)

      const dto = { name: 'Updated Name' }
      const result = await tournamentsApi.update(1, dto)

      expect(mockApi).toHaveBeenCalledWith('/tournaments/1', {
        method: 'PATCH',
        body: dto,
      })
      expect(result.name).toBe('Updated Name')
    })
  })

  describe('tournamentsApi.delete', () => {
    it('should call DELETE /tournaments/:id', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await tournamentsApi.delete(3)

      expect(mockApi).toHaveBeenCalledWith('/tournaments/3', {
        method: 'DELETE',
      })
    })
  })

  describe('tournamentsApi.register', () => {
    it('should call POST /tournaments/:id/register with data', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      const dto = { teamName: 'My Team', memberIds: [1, 2, 3] }
      await tournamentsApi.register(7, dto)

      expect(mockApi).toHaveBeenCalledWith('/tournaments/7/register', {
        method: 'POST',
        body: dto,
      })
    })

    it('should send empty object when no data provided', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await tournamentsApi.register(7)

      expect(mockApi).toHaveBeenCalledWith('/tournaments/7/register', {
        method: 'POST',
        body: {},
      })
    })
  })
})
