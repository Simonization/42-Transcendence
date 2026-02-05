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
  ChatType,
} from './chat';

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
