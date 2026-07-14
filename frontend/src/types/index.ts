/**
 * Types Index
 * Re-exports all types for convenient importing
 */

// API types
export {
  ApiError,
  type RequestOptions,
  type ApiErrorResponse,
  type PaginationParams,
  type PaginatedResponse,
} from './api';

// User types
export {
  type User,
  type UserProfile,
  type UserSettings,
  type UpdateProfileDto,
  type UpdateSettingsDto,
  Theme,
  UserRole,
  type UserRoleValue,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './user';

// Friend types
export {
  type Friend,
  type Block,
  type AddFriendDto,
  type RemoveFriendDto,
  type BlockUserDto,
  type UnblockUserDto,
  FriendStatus,
} from './friend';

// Chat types
export {
  type ChatRoom,
  type Message,
  type ChatParticipant,
  type CreateRoomDto,
  type SendMessageDto,
  type EditMessageDto,
  type TypingUser,
  type TypingEvent,
  type MessageReadEvent,
  ChatType,
} from './chat';

// Match types
export {
  type BackendMatch,
  type BackendUserMatch,
  type GameType,
  type MatchResult,
  type Match,
  type MatchStats,
} from './match';

// Auth types
export {
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type TwoFactorRequiredResponse,
  type LoginResponse,
  requiresTwoFactor,
  type Verify2FARequest,
  type Confirm2FARequest,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type MessageResponse,
  type RegisterResponse,
  TOKEN_KEYS,
} from './auth';

// Organization types
export {
  type Organization,
  type OrgMember,
  type CreateOrgDto,
  type UpdateOrgDto,
  type AddOrgMemberDto,
  OrgRole,
} from './organization';

// Tournament types
export {
  type BackendTournament,
  type BackendPhase,
  type BackendTeam,
  type BackendTeamMember,
  type BackendGame,
  type BackendMatch as BackendTournamentMatch,
  type TeamInvitation,
  type CreateTournamentDto,
  type CreatePhaseDto,
  type UpdateTournamentDto,
  type RegisterTournamentDto,
  type CreateTeamDto,
  type InvitePlayerDto,
  type CreateGameDto,
  type UpdateGameDto,
  TournamentStatus,
  PhaseType,
  TeamStatus,
  TeamInvitationStatus,
} from './tournament';
