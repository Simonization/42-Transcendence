/**
 * Matches API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { matchesApi, transformMatch, computeStats } from '../matches'
import * as apiModule from '../index'
import type { BackendMatch, Match } from '../../types'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

const makeBackendMatch = (overrides: Partial<BackendMatch> = {}): BackendMatch => ({
  id: 1,
  game_type: 'CHESS',
  created_at: '2026-02-07T10:00:00.000Z',
  userMatches: [
    { userId: 42, result: 'WIN', user: { id: 42, username: 'simon' } },
    { userId: 17, result: 'LOSS', user: { id: 17, username: 'opponent' } },
  ],
  ...overrides,
})

describe('Matches API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('matchesApi.getMyHistory', () => {
    it('should fetch current user match history', async () => {
      const mockMatches = [makeBackendMatch()]
      mockApi.mockResolvedValueOnce(mockMatches)

      const result = await matchesApi.getMyHistory()

      expect(mockApi).toHaveBeenCalledWith('/matches/my-history')
      expect(result).toEqual(mockMatches)
    })
  })

  describe('matchesApi.getPlayerHistory', () => {
    it('should fetch history for a specific player', async () => {
      mockApi.mockResolvedValueOnce([])

      await matchesApi.getPlayerHistory(42)

      expect(mockApi).toHaveBeenCalledWith('/matches/history/42')
    })
  })

  describe('matchesApi.getMatch', () => {
    it('should fetch a single match by ID', async () => {
      const match = makeBackendMatch()
      mockApi.mockResolvedValueOnce(match)

      const result = await matchesApi.getMatch(1)

      expect(mockApi).toHaveBeenCalledWith('/matches/1')
      expect(result).toEqual(match)
    })
  })

  describe('transformMatch', () => {
    it('should transform a WIN match correctly', () => {
      const raw = makeBackendMatch()
      const result = transformMatch(raw, 42)

      expect(result).toEqual({
        id: 1,
        opponent: 'opponent',
        game: 'Chess',
        result: 'win',
        date: '2026-02-07T10:00:00.000Z',
      })
    })

    it('should transform a LOSS match correctly', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { userId: 42, result: 'LOSS', user: { id: 42, username: 'simon' } },
          { userId: 17, result: 'WIN', user: { id: 17, username: 'winner' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).not.toBeNull()
      expect(result!.result).toBe('loss')
      expect(result!.opponent).toBe('winner')
    })

    it('should transform a DRAW match correctly', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { userId: 42, result: 'DRAW', user: { id: 42, username: 'simon' } },
          { userId: 17, result: 'DRAW', user: { id: 17, username: 'other' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).not.toBeNull()
      expect(result!.result).toBe('draw')
    })

    it('should return null for PENDING matches', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { userId: 42, result: 'PENDING', user: { id: 42, username: 'simon' } },
          { userId: 17, result: 'PENDING', user: { id: 17, username: 'other' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).toBeNull()
    })

    it('should return null when current user not found in userMatches', () => {
      const raw = makeBackendMatch()
      const result = transformMatch(raw, 999)

      expect(result).toBeNull()
    })

    it('should map game_type CHESS to Chess', () => {
      const raw = makeBackendMatch({ game_type: 'CHESS' })
      const result = transformMatch(raw, 42)

      expect(result!.game).toBe('Chess')
    })

    it('should map game_type LEAGUE to League of Legends', () => {
      const raw = makeBackendMatch({ game_type: 'LEAGUE' })
      const result = transformMatch(raw, 42)

      expect(result!.game).toBe('League of Legends')
    })

    it('should map unknown game_type to Unknown', () => {
      const raw = makeBackendMatch({ game_type: 'UNKNOWN_GAME' })
      const result = transformMatch(raw, 42)

      expect(result!.game).toBe('Unknown')
    })

    it('should handle missing opponent gracefully', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { userId: 42, result: 'WIN', user: { id: 42, username: 'simon' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).not.toBeNull()
      expect(result!.opponent).toBe('Unknown')
    })
  })

  describe('computeStats', () => {
    it('should compute stats for a list of matches', () => {
      const matches: Match[] = [
        { id: 1, opponent: 'a', game: 'Chess', result: 'win', date: '2026-01-01' },
        { id: 2, opponent: 'b', game: 'Chess', result: 'win', date: '2026-01-02' },
        { id: 3, opponent: 'c', game: 'Chess', result: 'loss', date: '2026-01-03' },
        { id: 4, opponent: 'd', game: 'Chess', result: 'draw', date: '2026-01-04' },
      ]
      const stats = computeStats(matches)

      expect(stats).toEqual({
        wins: 2,
        losses: 1,
        draws: 1,
        totalMatches: 4,
        winRate: 50,
      })
    })

    it('should handle empty match list', () => {
      const stats = computeStats([])

      expect(stats).toEqual({
        wins: 0,
        losses: 0,
        draws: 0,
        totalMatches: 0,
        winRate: 0,
      })
    })

    it('should compute 100% win rate', () => {
      const matches: Match[] = [
        { id: 1, opponent: 'a', game: 'Chess', result: 'win', date: '2026-01-01' },
        { id: 2, opponent: 'b', game: 'Chess', result: 'win', date: '2026-01-02' },
      ]
      const stats = computeStats(matches)

      expect(stats.winRate).toBe(100)
    })

    it('should round win rate to nearest integer', () => {
      const matches: Match[] = [
        { id: 1, opponent: 'a', game: 'Chess', result: 'win', date: '2026-01-01' },
        { id: 2, opponent: 'b', game: 'Chess', result: 'loss', date: '2026-01-02' },
        { id: 3, opponent: 'c', game: 'Chess', result: 'loss', date: '2026-01-03' },
      ]
      const stats = computeStats(matches)

      expect(stats.winRate).toBe(33)
    })
  })
})
