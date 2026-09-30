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
  game: { id: 1, name: 'Chess' },
  created_at: '2026-02-07T10:00:00.000Z',
  userMatches: [
    { user_id: 42, result: 'WIN', user: { id: 42, username: 'simon' } },
    { user_id: 17, result: 'LOSS', user: { id: 17, username: 'opponent' } },
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
          { user_id: 42, result: 'LOSS', user: { id: 42, username: 'simon' } },
          { user_id: 17, result: 'WIN', user: { id: 17, username: 'winner' } },
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
          { user_id: 42, result: 'DRAW', user: { id: 42, username: 'simon' } },
          { user_id: 17, result: 'DRAW', user: { id: 17, username: 'other' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).not.toBeNull()
      expect(result!.result).toBe('draw')
    })

    it('should return null for PENDING matches', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { user_id: 42, result: 'PENDING', user: { id: 42, username: 'simon' } },
          { user_id: 17, result: 'PENDING', user: { id: 17, username: 'other' } },
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

    it('should use the related game name', () => {
      const raw = makeBackendMatch({ game: { id: 7, name: 'League of Legends' } })
      const result = transformMatch(raw, 42)

      expect(result!.game).toBe('League of Legends')
    })

    it('should fall back to Unknown when no game is joined', () => {
      const raw = makeBackendMatch({ game: null })
      const result = transformMatch(raw, 42)

      expect(result!.game).toBe('Unknown')
    })

    it('should handle missing opponent gracefully', () => {
      const raw = makeBackendMatch({
        userMatches: [
          { user_id: 42, result: 'WIN', user: { id: 42, username: 'simon' } },
        ],
      })
      const result = transformMatch(raw, 42)

      expect(result).not.toBeNull()
      expect(result!.opponent).toBe('Unknown')
    })
  })

  describe('transformMatch (tournament matches, through the team slots)', () => {
    const slotted = (overrides: Partial<BackendMatch> = {}): BackendMatch =>
      makeBackendMatch({
        userMatches: [],
        game: null,
        status: 'FINISHED',
        team1: { id: 1, name: 'Alpha', members: [{ id: 42, username: 'simon' }] },
        team2: { id: 2, name: 'Bravo', members: [{ id: 17, username: 'other' }] },
        team1_score: 1,
        team2_score: 3,
        winner_id: 2,
        finished_at: '2026-02-08T10:00:00.000Z',
        phase: { game: { id: 1, name: 'Pong' }, tournament: { id: 5, name: 'Cup' } },
        ...overrides,
      })

    it('finds my side and scores it from there', () => {
      expect(transformMatch(slotted(), 42)).toEqual({
        id: 1,
        opponent: 'Bravo',
        game: 'Pong',
        result: 'loss',
        date: '2026-02-08T10:00:00.000Z',
        score: '1 - 3',
        tournament: 'Cup',
      })
      expect(transformMatch(slotted(), 17)).toMatchObject({ opponent: 'Alpha', result: 'win', score: '3 - 1' })
    })

    it('shows a walkover without a score', () => {
      const walkover = slotted({ team1_score: null, team2_score: null, winner_id: 1 })
      expect(transformMatch(walkover, 42)).toMatchObject({ result: 'win', score: null })
    })

    it('skips matches that are not finished, and matches of other teams', () => {
      expect(transformMatch(slotted({ status: 'AWAITING_CONFIRMATION', winner_id: null }), 42)).toBeNull()
      expect(transformMatch(slotted(), 999)).toBeNull()
    })
  })

  describe('match loop endpoints', () => {
    it.each([
      ['report', () => matchesApi.report(4, { team1Score: 2, team2Score: 1 }), { method: 'POST', body: { team1Score: 2, team2Score: 1 } }],
      ['confirm', () => matchesApi.confirm(4), { method: 'POST' }],
      ['dispute', () => matchesApi.dispute(4), { method: 'POST' }],
      ['resolve', () => matchesApi.resolve(4, { team1Score: 0, team2Score: 2 }), { method: 'POST', body: { team1Score: 0, team2Score: 2 } }],
      ['undo', () => matchesApi.undo(4), { method: 'POST' }],
    ])('%s posts to /matches/:id/%s', async (action, call, options) => {
      mockApi.mockResolvedValueOnce({})
      await call()
      expect(mockApi).toHaveBeenCalledWith(`/matches/4/${action}`, options)
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
