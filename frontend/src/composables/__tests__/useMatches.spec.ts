/**
 * useMatches Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BackendMatch } from '../../types'

vi.mock('../../api/matches', () => ({
  matchesApi: {
    getMyHistory: vi.fn(),
    getPlayerHistory: vi.fn(),
    getMatch: vi.fn(),
  },
  transformMatch: vi.fn(),
  computeStats: vi.fn(),
}))

import * as matchesApiModule from '../../api/matches'

const mockGetMyHistory = vi.mocked(matchesApiModule.matchesApi.getMyHistory)
const mockGetPlayerHistory = vi.mocked(matchesApiModule.matchesApi.getPlayerHistory)
const mockTransformMatch = vi.mocked(matchesApiModule.transformMatch)
const mockComputeStats = vi.mocked(matchesApiModule.computeStats)

describe('useMatches', () => {
  let useMatches: typeof import('../useMatches').useMatches

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-mock after resetModules
    vi.doMock('../../api/matches', () => ({
      matchesApi: {
        getMyHistory: mockGetMyHistory,
        getPlayerHistory: mockGetPlayerHistory,
        getMatch: vi.fn(),
      },
      transformMatch: mockTransformMatch,
      computeStats: mockComputeStats,
    }))

    const mod = await import('../useMatches')
    useMatches = mod.useMatches
  })

  describe('fetchMyHistory', () => {
    it('should load and transform matches', async () => {
      const rawMatches: BackendMatch[] = [
        {
          id: 1,
          game_type: 'CHESS',
          created_at: '2026-02-07T10:00:00.000Z',
          userMatches: [
            { userId: 42, result: 'WIN', user: { id: 42, username: 'simon' } },
            { userId: 17, result: 'LOSS', user: { id: 17, username: 'opponent' } },
          ],
        },
      ]
      mockGetMyHistory.mockResolvedValueOnce(rawMatches)
      mockTransformMatch.mockReturnValueOnce({
        id: 1,
        opponent: 'opponent',
        game: 'Chess',
        result: 'win',
        date: '2026-02-07T10:00:00.000Z',
      })
      mockComputeStats.mockReturnValue({
        wins: 1, losses: 0, draws: 0, totalMatches: 1, winRate: 100,
      })

      const { matches, isLoading, error, fetchMyHistory } = useMatches(42)

      await fetchMyHistory()

      expect(mockGetMyHistory).toHaveBeenCalled()
      expect(mockTransformMatch).toHaveBeenCalledWith(rawMatches[0], 42)
      expect(matches.value).toHaveLength(1)
      expect(matches.value[0].opponent).toBe('opponent')
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe('')
    })

    it('should filter out null (PENDING) matches', async () => {
      mockGetMyHistory.mockResolvedValueOnce([
        { id: 1, game_type: 'CHESS', created_at: '', userMatches: [] },
        { id: 2, game_type: 'CHESS', created_at: '', userMatches: [] },
      ] as BackendMatch[])
      mockTransformMatch
        .mockReturnValueOnce({ id: 1, opponent: 'a', game: 'Chess', result: 'win', date: '' })
        .mockReturnValueOnce(null)

      const { matches, fetchMyHistory } = useMatches(42)
      await fetchMyHistory()

      expect(matches.value).toHaveLength(1)
    })

    it('should fall back to demo data on failure', async () => {
      mockGetMyHistory.mockRejectedValueOnce(new Error('Network error'))

      const { error, isLoading, matches, fetchMyHistory, demoMode } = useMatches(42)
      await fetchMyHistory()

      expect(demoMode.value).toBe(true)
      expect(error.value).toBe('')
      expect(matches.value.length).toBeGreaterThan(0)
      expect(isLoading.value).toBe(false)
    })

    it('should clear demo state on successful retry', async () => {
      mockGetMyHistory.mockRejectedValueOnce(new Error('fail'))

      const { error, fetchMyHistory, demoMode } = useMatches(42)
      await fetchMyHistory()
      expect(demoMode.value).toBe(true)
      expect(error.value).toBe('')

      mockGetMyHistory.mockResolvedValueOnce([])
      await fetchMyHistory()
      expect(error.value).toBe('')
    })
  })

  describe('fetchPlayerHistory', () => {
    it('should load history for another player', async () => {
      mockGetPlayerHistory.mockResolvedValueOnce([])

      const { fetchPlayerHistory } = useMatches(42)
      await fetchPlayerHistory(99)

      expect(mockGetPlayerHistory).toHaveBeenCalledWith(99)
    })

    it('should set error on failure', async () => {
      mockGetPlayerHistory.mockRejectedValueOnce(new Error('fail'))

      const { error, fetchPlayerHistory } = useMatches(42)
      await fetchPlayerHistory(99)

      expect(error.value).toBe('Failed to load match history')
    })
  })

  describe('computed properties', () => {
    it('should compute unique games from matches', async () => {
      mockGetMyHistory.mockResolvedValueOnce([
        { id: 1, game_type: 'CHESS', created_at: '', userMatches: [] },
        { id: 2, game_type: 'LEAGUE', created_at: '', userMatches: [] },
        { id: 3, game_type: 'CHESS', created_at: '', userMatches: [] },
      ] as BackendMatch[])
      mockTransformMatch
        .mockReturnValueOnce({ id: 1, opponent: 'a', game: 'Chess', result: 'win', date: '' })
        .mockReturnValueOnce({ id: 2, opponent: 'b', game: 'League of Legends', result: 'loss', date: '' })
        .mockReturnValueOnce({ id: 3, opponent: 'c', game: 'Chess', result: 'win', date: '' })
      mockComputeStats.mockReturnValue({
        wins: 2, losses: 1, draws: 0, totalMatches: 3, winRate: 67,
      })

      const { uniqueGames, fetchMyHistory } = useMatches(42)
      await fetchMyHistory()

      expect(uniqueGames.value).toHaveLength(2)
      expect(uniqueGames.value).toContain('Chess')
      expect(uniqueGames.value).toContain('League of Legends')
    })

    it('should handle empty match list for uniqueGames', () => {
      const { uniqueGames } = useMatches(42)
      expect(uniqueGames.value).toHaveLength(0)
    })
  })
})
