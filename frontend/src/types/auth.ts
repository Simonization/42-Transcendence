/**
 * Authentication Types
 * Types for auth requests and responses
 */

import type { User } from './user';

/** Login request payload */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Registration request payload */
export interface RegisterRequest {
  username: string;
  mail: string;
  password: string;
}

/** Successful authentication response */
export interface AuthResponse {
  user: Pick<User, 'id' | 'username' | 'mail'>;
  accessToken: string;
  refreshToken: string;
}

/** Response when 2FA is required */
export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: number;
  message: string;
}

/** Union type for login response */
export type LoginResponse = AuthResponse | TwoFactorRequiredResponse;

/** Check if response requires 2FA */
export function requiresTwoFactor(
  response: LoginResponse
): response is TwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor === true;
}

/** 2FA verification request */
export interface Verify2FARequest {
  userId: number;
  code: string;
}

/** 2FA confirmation request (when enabling) */
export interface Confirm2FARequest {
  code: string;
}

/** Token refresh request */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Token refresh response */
export interface RefreshTokenResponse {
  accessToken: string;
}

/** Generic message response */
export interface MessageResponse {
  message: string;
}

/** Registration response */
export interface RegisterResponse {
  message: string;
  user: Pick<User, 'id' | 'username' | 'mail'> & {
    isEmailVerified: boolean;
  };
}

/** Token storage keys */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;
