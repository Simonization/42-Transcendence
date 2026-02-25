/**
 * Teams Composable
 * Manages team creation, invitations, and locking for tournament registration
 */

import { ref } from 'vue'
import { teamsApi } from '../api/teams'
import { getErrorMessage } from '../utils/error'
import type {
  BackendTeam,
  TeamInvitation,
  CreateTeamDto,
} from '../types'

export function useTeams() {
  const myTeam = ref<BackendTeam | null>(null)
  const myInvitations = ref<TeamInvitation[]>([])
  const isLoading = ref(false)
  const error = ref('')

  /**
   * Create a team for a tournament.
   * Current user becomes captain and first member.
   */
  const createTeam = async (data: CreateTeamDto): Promise<BackendTeam | null> => {
    isLoading.value = true
    error.value = ''
    try {
      const team = await teamsApi.create(data)
      myTeam.value = team
      return team
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to create team')
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Invite a player to the current team
   */
  const invitePlayer = async (teamId: number, userId: number): Promise<TeamInvitation | null> => {
    error.value = ''
    try {
      return await teamsApi.invitePlayer(teamId, { userId })
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to invite player')
      return null
    }
  }

  /**
   * Lock the team (captain only, team must match game's teamSize)
   */
  const lockTeam = async (teamId: number): Promise<boolean> => {
    isLoading.value = true
    error.value = ''
    try {
      const team = await teamsApi.lock(teamId)
      myTeam.value = team
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to lock team')
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch all pending team invitations for the current user
   */
  const fetchMyInvitations = async () => {
    isLoading.value = true
    error.value = ''
    try {
      myInvitations.value = await teamsApi.getMyInvitations()
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load invitations')
      myInvitations.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Accept a team invitation
   */
  const acceptInvitation = async (invitationId: number): Promise<boolean> => {
    error.value = ''
    try {
      await teamsApi.acceptInvitation(invitationId)
      // Remove from local list
      myInvitations.value = myInvitations.value.filter(i => i.id !== invitationId)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to accept invitation')
      return false
    }
  }

  /**
   * Decline a team invitation
   */
  const declineInvitation = async (invitationId: number): Promise<boolean> => {
    error.value = ''
    try {
      await teamsApi.declineInvitation(invitationId)
      myInvitations.value = myInvitations.value.filter(i => i.id !== invitationId)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to decline invitation')
      return false
    }
  }

  return {
    myTeam,
    myInvitations,
    isLoading,
    error,
    createTeam,
    invitePlayer,
    lockTeam,
    fetchMyInvitations,
    acceptInvitation,
    declineInvitation,
  }
}
