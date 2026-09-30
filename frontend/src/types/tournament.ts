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
  CANCELLED = 'CANCELLED',
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
  | 'AWAITING_CONFIRMATION'
  | 'DISPUTED'
  | 'FINISHED'
  | 'CANCELLED'
  | 'BYE'

/**
 * The real `matches` row. The two teams sit in explicit slots (team1 / team2): a winner moves
 * into the slot its match feeds, so the order is meaningful.
 */
export interface BackendMatch {
  id: number
  phase_id: number
  tournament_id?: number | null
  round_order: number | null
  /** Group stage only: 0 = group A. */
  group_index?: number | null
  status: BackendMatchStatus
  team1_id: number | null
  team2_id: number | null
  team1?: BackendTeam | null
  team2?: BackendTeam | null
  team1_score: number | null
  team2_score: number | null
  reported_by_team_id?: number | null
  reported_at?: string | null
  finished_at?: string | null
  winner_id: number | null
  winner_next_match_id?: number | null
  winner_next_match_slot?: number | null
  /** Display form of the score ("2-1"). */
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
  /** INVITE = a team invited a user; REQUEST = a user asked to join (sender_id is the requester). */
  direction?: 'INVITE' | 'REQUEST'
  note?: string | null
}

/** Registration capacity of a tournament (locked teams vs max_participants). */
export interface TournamentAvailability {
  tournamentId: number
  maxTeams: number | null
  lockedTeams: number
  spotsLeft: number | null
  full: boolean
  registrationOpen: boolean
}

/** One entry of the looking-for-team board. */
export interface LookingForTeamEntry {
  id: number
  userId: number
  tournamentId: number
  note: string | null
  createdAt: string
  user?: BackendTeamMember
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
  finished_at?: string | null
  /** Team ids, seed 1 first. Admin-set before start, frozen to the entrants at start. */
  seed_order?: number[] | null
  /** Served by GET /tournaments/:id: what the bracket preview draws before start. */
  seeding?: SeedingView
  /** Served by GET /tournaments/:id: standings of group / round-robin phases. */
  standings?: PhaseStandings[]
}

/** GET /tournaments/:id/seeding — the same functions build the real bracket at start. */
export interface SeedingView {
  tournamentId: number
  started: boolean
  phaseType: PhaseType | null
  /** Teams that enter (LOCKED only), seed 1 first. */
  teams: { id: number; name: string; status: string; seed: number; memberCount: number }[]
  /** Knockout first round as team ids, null for a bye. */
  pairs: [number | null, number | null][]
  /** Group phases: team ids per group. */
  groups: number[][]
  /** Registered teams that will not enter (not LOCKED). */
  excluded: { id: number; name: string; status: string }[]
}

export interface StandingRow {
  teamId: number
  name: string
  rank: number
  played: number
  wins: number
  losses: number
  points: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  seed: number | null
  withdrawn: boolean
}

export interface PhaseStandings {
  phaseId: number
  phaseOrder: number
  type: PhaseType
  qualifiersPerGroup: number | null
  groups: { index: number; label: string; rows: StandingRow[] }[]
}

export interface ReportScoreDto {
  team1Score: number
  team2Score: number
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
  /** Who may report / confirm for this team: its captain and promoted admins. */
  captainId?: number
  adminIds?: number[]
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
  /** The backend status, for actions. Absent on provisional (not yet persisted) matches. */
  state?: BackendMatchStatus
  /** Numeric match id for API calls; absent on provisional matches. */
  matchId?: number
  reportedByTeamId?: string | null
  /** Won by walkover (a team withdrew). */
  walkover?: boolean
}

export interface BracketRound {
  label: string
  matches: BracketMatch[]
}

export interface BracketGroup {
  index: number
  label: string
  /** Standings, best first; empty before the group has results or while provisional. */
  standings: StandingRow[]
  /** Teams in the group, when there are no standings yet. */
  players: BracketPlayer[]
  rounds: BracketRound[]
  qualifiersPerGroup: number | null
}

export interface TournamentBracket {
  tournamentId: string
  bracketType: BracketType
  /** Knockout rounds, first round first. Empty while only a group stage exists. */
  rounds: BracketRound[]
  /** Group stage, when the tournament has one. */
  groups?: BracketGroup[]
  champion: BracketPlayer | null
  /** True while the field can still change: seeded from registrations, not persisted matches. */
  provisional?: boolean
  completedAt?: string | null
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
