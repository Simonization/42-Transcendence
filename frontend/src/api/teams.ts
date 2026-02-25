/**
 * Teams API Module
 * Team creation, invitations, and management for tournaments
 */

import { api } from './index'
import type {
  BackendTeam,
  CreateTeamDto,
  InvitePlayerDto,
  TeamInvitation,
} from '../types'

export const teamsApi = {
  /**
   * Create a new team for a tournament
   * Current user becomes captain and first member
   */
  create(data: CreateTeamDto): Promise<BackendTeam> {
    return api<BackendTeam>('/teams', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Invite a player to a team (captain only)
   */
  invitePlayer(teamId: number, data: InvitePlayerDto): Promise<TeamInvitation> {
    return api<TeamInvitation>(`/teams/${teamId}/invite`, {
      method: 'PATCH',
      body: data,
    })
  },

  /**
   * Kick a player from a team (captain only)
   */
  kickPlayer(teamId: number, userId: number): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/kick`, {
      method: 'PATCH',
      body: { userId },
    })
  },

  /**
   * Lock a team (captain only, team must be full)
   * After locking, no more invitations and team can participate
   */
  lock(teamId: number): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/lock`, {
      method: 'PATCH',
    })
  },

  /**
   * Get current user's pending team invitations
   */
  getMyInvitations(): Promise<TeamInvitation[]> {
    return api<TeamInvitation[]>('/teams/invitations/my')
  },

  /**
   * Accept a team invitation
   */
  acceptInvitation(invitationId: number): Promise<{ message: string; teamId: number }> {
    return api<{ message: string; teamId: number }>(`/teams/invitations/${invitationId}/accept`, {
      method: 'PATCH',
    })
  },

  /**
   * Decline a team invitation
   */
  declineInvitation(invitationId: number): Promise<TeamInvitation> {
    return api<TeamInvitation>(`/teams/invitations/${invitationId}/decline`, {
      method: 'PATCH',
    })
  },
}
