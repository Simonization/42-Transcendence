/**
 * Tournament Types
 * Backend-aligned types for Nicolas's tournament module (backend_nico)
 */

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

export enum PhaseType {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum TeamStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
  ARCHIVED = 'ARCHIVED',
}

export enum TeamInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface BackendGame {
  id: number
  name: string
  teamCount: number
  teamSize: number
  createdAt?: string
}

export interface BackendMatch {
  id: number
  phase_id: number
  round: number
  position: number
  team1_id: number | null
  team2_id: number | null
  team1_score: number | null
  team2_score: number | null
  winner_id: number | null
  status: string
  scheduledAt: string | null
  completedAt: string | null
}

export interface BackendPhase {
  id: number
  tournament_id: number
  order: number
  type: PhaseType
  game_id: number
  game?: BackendGame
  matches: BackendMatch[]
}

export interface BackendTeamMember {
  id: number
  username: string
  avatarUrl?: string | null
}

export interface BackendTeam {
  id: number
  name: string
  status: TeamStatus | string
  captain_id: number
  captain?: BackendTeamMember
  members: BackendTeamMember[]
  tournament?: BackendTournament
}

export interface TeamInvitation {
  id: number
  team_id: number
  team?: BackendTeam
  sender_id: number
  sender?: BackendTeamMember
  receiver_id: number
  receiver?: BackendTeamMember
  status: TeamInvitationStatus | string
}

export interface BackendTournament {
  id: number
  name: string
  description: string | null
  max_participants: number
  status: TournamentStatus
  phases: BackendPhase[]
  teams: BackendTeam[]
  createdAt: string
  updatedAt?: string
}

export interface CreatePhaseDto {
  order: number
  type: PhaseType
  game_id: number
}

export interface CreateTournamentDto {
  name: string
  description?: string
  max_participants?: number
  phases: CreatePhaseDto[]
}

export interface UpdateTournamentDto {
  name?: string
  description?: string
  max_participants?: number
}

export interface RegisterTournamentDto {
  teamName?: string
  memberIds?: number[]
}

export interface CreateTeamDto {
  name: string
  tournament_id: number
}

export interface InvitePlayerDto {
  userId: number
}

export interface CreateGameDto {
  name: string
  team_count: number
  team_size: number
}
