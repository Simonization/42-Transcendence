/**
 * useTeams Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as teamsApiModule from '../../api/teams'

vi.mock('../../api/teams', () => ({
  teamsApi: {
    create: vi.fn(),
    invitePlayer: vi.fn(),
    kickPlayer: vi.fn(),
    lock: vi.fn(),
    getMyInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
  },
}))

const mockCreate = vi.mocked(teamsApiModule.teamsApi.create)
const mockInvitePlayer = vi.mocked(teamsApiModule.teamsApi.invitePlayer)
const mockLock = vi.mocked(teamsApiModule.teamsApi.lock)
const mockGetMyInvitations = vi.mocked(teamsApiModule.teamsApi.getMyInvitations)
const mockAcceptInvitation = vi.mocked(teamsApiModule.teamsApi.acceptInvitation)
const mockDeclineInvitation = vi.mocked(teamsApiModule.teamsApi.declineInvitation)

import { useTeams } from '../useTeams'

const MOCK_TEAM = { id: 1, name: 'Alpha Squad', tournamentId: 5, status: 'draft' }
const MOCK_INVITATION = { id: 10, teamId: 1, userId: 3, status: 'pending' }

describe('useTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTeam', () => {
    it('should return team on success and set myTeam', async () => {
      mockCreate.mockResolvedValueOnce(MOCK_TEAM as any)

      const { myTeam, isLoading, error, createTeam } = useTeams()
      const result = await createTeam({ name: 'Alpha Squad', tournament_id: 5 })

      expect(result).toEqual(MOCK_TEAM)
      expect(myTeam.value).toEqual(MOCK_TEAM)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe('')
    })

    it('should return null and set error on failure', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'))

      const { myTeam, error, createTeam } = useTeams()
      const result = await createTeam({ name: 'Alpha Squad', tournament_id: 5 })

      expect(result).toBeNull()
      expect(myTeam.value).toBeNull()
      expect(error.value).toBeTruthy()
    })

    it('should set isLoading to false after error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('fail'))

      const { isLoading, createTeam } = useTeams()
      await createTeam({ name: 'X', tournament_id: 1 })

      expect(isLoading.value).toBe(false)
    })

    it('should call teamsApi.create with correct dto', async () => {
      mockCreate.mockResolvedValueOnce(MOCK_TEAM as any)

      const { createTeam } = useTeams()
      await createTeam({ name: 'Alpha', tournament_id: 3 })

      expect(mockCreate).toHaveBeenCalledWith({ name: 'Alpha', tournament_id: 3 })
    })
  })

  describe('invitePlayer', () => {
    it('should return invitation on success', async () => {
      mockInvitePlayer.mockResolvedValueOnce(MOCK_INVITATION as any)

      const { invitePlayer } = useTeams()
      const result = await invitePlayer(1, 3)

      expect(result).toEqual(MOCK_INVITATION)
      expect(mockInvitePlayer).toHaveBeenCalledWith(1, { userId: 3 })
    })

    it('should return null and set error on failure', async () => {
      mockInvitePlayer.mockRejectedValueOnce(new Error('Not captain'))

      const { error, invitePlayer } = useTeams()
      const result = await invitePlayer(1, 3)

      expect(result).toBeNull()
      expect(error.value).toBeTruthy()
    })
  })

  describe('lockTeam', () => {
    it('should return true and update myTeam on success', async () => {
      const lockedTeam = { ...MOCK_TEAM, status: 'locked' }
      mockLock.mockResolvedValueOnce(lockedTeam as any)

      const { myTeam, lockTeam } = useTeams()
      const result = await lockTeam(1)

      expect(result).toBe(true)
      expect(myTeam.value).toEqual(lockedTeam)
    })

    it('should return false and set error on failure', async () => {
      mockLock.mockRejectedValueOnce(new Error('Team not full'))

      const { error, lockTeam } = useTeams()
      const result = await lockTeam(1)

      expect(result).toBe(false)
      expect(error.value).toBeTruthy()
    })

    it('should set isLoading to false after lock', async () => {
      mockLock.mockResolvedValueOnce(MOCK_TEAM as any)

      const { isLoading, lockTeam } = useTeams()
      await lockTeam(1)

      expect(isLoading.value).toBe(false)
    })
  })

  describe('fetchMyInvitations', () => {
    it('should populate myInvitations on success', async () => {
      const invitations = [MOCK_INVITATION, { ...MOCK_INVITATION, id: 11 }]
      mockGetMyInvitations.mockResolvedValueOnce(invitations as any)

      const { myInvitations, fetchMyInvitations } = useTeams()
      await fetchMyInvitations()

      expect(myInvitations.value).toEqual(invitations)
    })

    it('should set empty array and error on failure', async () => {
      mockGetMyInvitations.mockRejectedValueOnce(new Error('Unauthorized'))

      const { myInvitations, error, fetchMyInvitations } = useTeams()
      await fetchMyInvitations()

      expect(myInvitations.value).toEqual([])
      expect(error.value).toBeTruthy()
    })
  })

  describe('acceptInvitation', () => {
    it('should return true and remove invitation from list', async () => {
      mockGetMyInvitations.mockResolvedValueOnce([MOCK_INVITATION] as any)
      mockAcceptInvitation.mockResolvedValueOnce({ message: 'ok', teamId: 1 })

      const { myInvitations, acceptInvitation, fetchMyInvitations } = useTeams()
      await fetchMyInvitations()
      const result = await acceptInvitation(10)

      expect(result).toBe(true)
      expect(myInvitations.value.find(i => i.id === 10)).toBeUndefined()
    })

    it('should return false on failure', async () => {
      mockAcceptInvitation.mockRejectedValueOnce(new Error('Already accepted'))

      const { acceptInvitation } = useTeams()
      const result = await acceptInvitation(10)

      expect(result).toBe(false)
    })
  })

  describe('declineInvitation', () => {
    it('should return true and remove invitation from list', async () => {
      mockGetMyInvitations.mockResolvedValueOnce([MOCK_INVITATION] as any)
      mockDeclineInvitation.mockResolvedValueOnce({ ...MOCK_INVITATION, status: 'declined' } as any)

      const { myInvitations, declineInvitation, fetchMyInvitations } = useTeams()
      await fetchMyInvitations()
      const result = await declineInvitation(10)

      expect(result).toBe(true)
      expect(myInvitations.value.find(i => i.id === 10)).toBeUndefined()
    })

    it('should return false on failure', async () => {
      mockDeclineInvitation.mockRejectedValueOnce(new Error('Not found'))

      const { declineInvitation } = useTeams()
      const result = await declineInvitation(10)

      expect(result).toBe(false)
    })
  })
})
