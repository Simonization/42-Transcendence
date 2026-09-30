/**
 * Teams API Module
 * Team creation, invitations, and management for tournaments
 */

import { api } from './index'
import type {
  BackendTeam,
  CreateTeamDto,
  InvitePlayerDto,
  TeamAdminState,
  TeamInvitation,
} from '../types'
import type { LookingForTeamEntry, TournamentAvailability } from '../types/tournament'

export interface MyTournamentStatus {
  team: BackendTeam | null
  invitation: TeamInvitation | null
  /** Pending join requests I sent to teams of this tournament. */
  requests?: TeamInvitation[]
  /** Roster spots left on my team; null without a team. */
  teamSpotsLeft?: number | null
  /** Registration capacity ("tournament full"). */
  availability?: TournamentAvailability | null
  /** My looking-for-team flag for this tournament, if set. */
  lookingForTeam?: LookingForTeamEntry | null
}

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
   * Kick a player from a team (captain or team admin)
   */
  kickPlayer(teamId: number, userId: number): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/kick`, {
      method: 'PATCH',
      body: { userId },
    })
  },

  /**
   * Grant admin rights to a member (captain or an existing admin)
   */
  promote(teamId: number, userId: number): Promise<TeamAdminState> {
    return api<TeamAdminState>(`/teams/${teamId}/promote`, {
      method: 'PATCH',
      body: { userId },
    })
  },

  /**
   * Revoke admin rights. The captain can demote anyone; an admin can only step down.
   */
  demote(teamId: number, userId: number): Promise<TeamAdminState> {
    return api<TeamAdminState>(`/teams/${teamId}/demote`, {
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

  /**
   * Delete a team (captain only, DRAFT only)
   */
  deleteTeam(teamId: number): Promise<{ message: string }> {
    return api<{ message: string }>(`/teams/${teamId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Leave a team (non-captain member only, DRAFT only)
   */
  leaveTeam(teamId: number): Promise<{ message: string }> {
    return api<{ message: string }>(`/teams/${teamId}/leave`, {
      method: 'PATCH',
    })
  },

  /**
   * Get current user's team (or pending invitation) for a tournament
   */
  getMyTeam(tournamentId: number): Promise<MyTournamentStatus> {
    return api<MyTournamentStatus>(`/teams/mine?tournament_id=${tournamentId}`)
  },

  /**
   * Get pending invitations sent by the captain for a team
   */
  getTeamInvitations(teamId: number): Promise<TeamInvitation[]> {
    return api<TeamInvitation[]>(`/teams/${teamId}/pending-invitations`)
  },

  /**
   * Rename a team (captain or admin, before the tournament starts)
   */
  rename(teamId: number, name: string): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/rename`, {
      method: 'PATCH',
      body: { name },
    })
  },

  /**
   * Unlock a LOCKED team back to DRAFT while registration is open (captain or admin)
   */
  unlock(teamId: number): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/unlock`, {
      method: 'PATCH',
    })
  },

  /**
   * Hand the captaincy to another member (captain only); the old captain becomes an admin
   */
  transferCaptain(teamId: number, userId: number): Promise<BackendTeam> {
    return api<BackendTeam>(`/teams/${teamId}/transfer-captain`, {
      method: 'PATCH',
      body: { userId },
    })
  },

  /**
   * Cancel a pending invitation (team captain/admin) or my own join request
   */
  cancelInvitation(invitationId: number): Promise<TeamInvitation> {
    return api<TeamInvitation>(`/teams/invitations/${invitationId}`, {
      method: 'DELETE',
    })
  },

  /**
   * The team's invite code (members only)
   */
  getJoinCode(teamId: number): Promise<{ joinCode: string }> {
    return api<{ joinCode: string }>(`/teams/${teamId}/join-code`)
  },

  /**
   * Issue a new invite code, invalidating the old one (captain or admin)
   */
  regenerateJoinCode(teamId: number): Promise<{ joinCode: string }> {
    return api<{ joinCode: string }>(`/teams/${teamId}/join-code/regenerate`, {
      method: 'PATCH',
    })
  },

  /**
   * Join a team directly with its invite code
   */
  joinByCode(code: string): Promise<{ message: string; teamId: number; tournamentId?: number | null }> {
    return api<{ message: string; teamId: number; tournamentId?: number | null }>('/teams/join', {
      method: 'POST',
      body: { code },
    })
  },

  /**
   * Ask to join a team
   */
  requestToJoin(teamId: number, note?: string): Promise<TeamInvitation> {
    return api<TeamInvitation>(`/teams/${teamId}/requests`, {
      method: 'POST',
      body: note ? { note } : {},
    })
  },

  /**
   * Pending join requests for my team (captain or admin)
   */
  getJoinRequests(teamId: number): Promise<TeamInvitation[]> {
    return api<TeamInvitation[]>(`/teams/${teamId}/requests`)
  },

  /**
   * Accept a join request (captain or admin)
   */
  acceptJoinRequest(requestId: number): Promise<{ message: string; teamId: number }> {
    return api<{ message: string; teamId: number }>(`/teams/requests/${requestId}/accept`, {
      method: 'PATCH',
    })
  },

  /**
   * Decline a join request (captain or admin)
   */
  declineJoinRequest(requestId: number): Promise<TeamInvitation> {
    return api<TeamInvitation>(`/teams/requests/${requestId}/decline`, {
      method: 'PATCH',
    })
  },

  /**
   * Registration capacity of a tournament (locked teams vs max_participants)
   */
  getAvailability(tournamentId: number): Promise<TournamentAvailability> {
    return api<TournamentAvailability>(`/teams/tournament/${tournamentId}/availability`)
  },

  /**
   * Looking-for-team board of a tournament
   */
  getLookingForTeam(tournamentId: number): Promise<LookingForTeamEntry[]> {
    return api<LookingForTeamEntry[]>(`/teams/lft/${tournamentId}`)
  },

  /**
   * Flag myself as looking for a team (or update my note)
   */
  flagLookingForTeam(tournamentId: number, note?: string): Promise<LookingForTeamEntry> {
    return api<LookingForTeamEntry>(`/teams/lft/${tournamentId}`, {
      method: 'POST',
      body: note ? { note } : {},
    })
  },

  /**
   * Remove myself from the looking-for-team board
   */
  unflagLookingForTeam(tournamentId: number): Promise<{ message: string }> {
    return api<{ message: string }>(`/teams/lft/${tournamentId}`, {
      method: 'DELETE',
    })
  },
}
