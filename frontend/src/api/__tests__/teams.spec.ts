/**
 * Teams API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { teamsApi } from '../teams'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Teams API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a team with correct payload', async () => {
      const mockTeam = { id: 1, name: 'Alpha Squad', tournamentId: 5 }
      mockApi.mockResolvedValueOnce(mockTeam)

      const dto = { name: 'Alpha Squad', tournament_id: 5 }
      const result = await teamsApi.create(dto)

      expect(mockApi).toHaveBeenCalledWith('/teams', {
        method: 'POST',
        body: dto,
      })
      expect(result).toEqual(mockTeam)
    })
  })

  describe('invitePlayer', () => {
    it('should send invite to a player', async () => {
      const mockInvitation = { id: 10, teamId: 1, userId: 3, status: 'pending' }
      mockApi.mockResolvedValueOnce(mockInvitation)

      const result = await teamsApi.invitePlayer(1, { userId: 3 })

      expect(mockApi).toHaveBeenCalledWith('/teams/1/invite', {
        method: 'PATCH',
        body: { userId: 3 },
      })
      expect(result).toEqual(mockInvitation)
    })
  })

  describe('kickPlayer', () => {
    it('should kick a player from a team', async () => {
      const mockTeam = { id: 1, name: 'Alpha Squad' }
      mockApi.mockResolvedValueOnce(mockTeam)

      const result = await teamsApi.kickPlayer(1, 3)

      expect(mockApi).toHaveBeenCalledWith('/teams/1/kick', {
        method: 'PATCH',
        body: { userId: 3 },
      })
      expect(result).toEqual(mockTeam)
    })
  })

  describe('lock', () => {
    it('should lock a team', async () => {
      const mockTeam = { id: 1, name: 'Alpha Squad', status: 'locked' }
      mockApi.mockResolvedValueOnce(mockTeam)

      const result = await teamsApi.lock(1)

      expect(mockApi).toHaveBeenCalledWith('/teams/1/lock', {
        method: 'PATCH',
      })
      expect(result).toEqual(mockTeam)
    })
  })

  describe('getMyInvitations', () => {
    it('should fetch current user pending invitations', async () => {
      const mockInvitations = [
        { id: 10, teamId: 1, userId: 2, status: 'pending' },
        { id: 11, teamId: 2, userId: 2, status: 'pending' },
      ]
      mockApi.mockResolvedValueOnce(mockInvitations)

      const result = await teamsApi.getMyInvitations()

      expect(mockApi).toHaveBeenCalledWith('/teams/invitations/my')
      expect(result).toEqual(mockInvitations)
    })
  })

  describe('acceptInvitation', () => {
    it('should accept a team invitation', async () => {
      const mockResponse = { message: 'Invitation accepted', teamId: 1 }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await teamsApi.acceptInvitation(10)

      expect(mockApi).toHaveBeenCalledWith('/teams/invitations/10/accept', {
        method: 'PATCH',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('declineInvitation', () => {
    it('should decline a team invitation', async () => {
      const mockInvitation = { id: 10, status: 'declined' }
      mockApi.mockResolvedValueOnce(mockInvitation)

      const result = await teamsApi.declineInvitation(10)

      expect(mockApi).toHaveBeenCalledWith('/teams/invitations/10/decline', {
        method: 'PATCH',
      })
      expect(result).toEqual(mockInvitation)
    })
  })
})
