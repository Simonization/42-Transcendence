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
  SWISS = 'SWISS',
  GROUP_STAGE = 'GROUP_STAGE',
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

/** Mirrors MatchStatus in the backend's match entity. */
export type BackendMatchStatus =
  | 'WAITING'
  | 'READY'
  | 'ONGOING'
  | 'FINISHED'
  | 'CANCELLED'
  | 'BYE'

/**
 * The real `matches` row. Teams come through a join table rather than team1_id/team2_id, and
 * the score is one string rather than a pair of numbers.
 */
export interface BackendMatch {
  id: number
  phase_id: number
  round_order: number | null
  status: BackendMatchStatus
  teams?: BackendTeam[]
  winner_id: number | null
  score: string | null
  created_at: string
  game_data?: Record<string, unknown> | null
}

export interface BackendPhase {
  id: number
  tournament_id: number
  order: number
  type: PhaseType
  game_id: number
  game?: BackendGame
  matches: BackendMatch[]
  teams_limit_start: number
  teams_limit_end: number
  swiss_rounds?: number | null
  group_size?: number | null
  group_winners_count?: number | null
}

export interface BackendTeamMember {
  id: number
  username: string
  avatarUrl?: string | null
}

export interface BackendTeamAdmin {
  id: number
  userId: number
  teamId: number
  grantedBy: number
  grantedAt: string
}

export interface BackendTeam {
  id: number
  name: string
  status: TeamStatus | string
  captain_id: number
  captain?: BackendTeamMember
  members: BackendTeamMember[]
  /** Promoted members only; the captain is an admin via captain_id and is never listed here. */
  admins?: BackendTeamAdmin[]
  tournament?: BackendTournament
}

/** Returned by the promote/demote endpoints. */
export interface TeamAdminState {
  teamId: number
  captainId: number
  adminIds: number[]
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
  scheduledAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface CreatePhaseDto {
  order: number
  type: PhaseType
  game_id: number
  teams_limit_start: number
  teams_limit_end: number
  swiss_rounds?: number
  group_size?: number
  group_winners_count?: number
}

export interface CreateTournamentDto {
  name: string
  description?: string
  max_participants?: number
  scheduled_at?: string
  phases: CreatePhaseDto[]
}

export interface UpdateTournamentDto {
  name?: string
  description?: string
  max_participants?: number
  scheduled_at?: string | null
  status?: TournamentStatus
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

export interface UpdateGameDto {
  name?: string
  team_count?: number
  team_size?: number
}

// ─── Bracket view-model (what BracketVisualization renders) ──────────────────

export type MatchStatus = 'upcoming' | 'live' | 'completed'
export type BracketType = 'single-elimination' | 'double-elimination' | 'round-robin'

/** A bracket slot. Named "player" for historical reasons; it holds a team. */
export interface BracketPlayer {
  id: string
  username: string
  avatar: string
  rating: number
  seed: number
}

export interface BracketMatch {
  id: string
  roundIndex: number
  matchIndex: number
  player1: BracketPlayer | null
  player2: BracketPlayer | null
  score1: number | null
  score2: number | null
  status: MatchStatus
  winnerId: string | null
  scheduledAt: string
  completedAt: string | null
}

export interface BracketRound {
  label: string
  matches: BracketMatch[]
}

export interface TournamentBracket {
  tournamentId: string
  bracketType: BracketType
  rounds: BracketRound[]
  champion: BracketPlayer | null
  /** True while the field can still change: seeded from registrations, not persisted matches. */
  provisional?: boolean
}

/** View-model a tournament card renders; produced from BackendTournament by tournamentMapper. */
export interface Tournament {
  id: string
  name: string
  game: string
  date: string
  endDate: string
  status: 'open' | 'live' | 'finished'
  maxParticipants: number
  currentParticipants: number
  format: 'single-elimination' | 'double-elimination' | 'round-robin'
  description: string
  rules: string
  prize: string
  organizer: {
    name: string
  }
  featured?: boolean
}
