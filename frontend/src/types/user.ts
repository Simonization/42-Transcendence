/**
 * User Types
 * Types matching backend User, UserProfile, and UserSettings entities
 */

/** User profile information */
export interface UserProfile {
  userId: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

/** User settings/preferences */
export interface UserSettings {
  userId: number;
  /** Supported languages */
  language: 'en' | 'fr' | 'tr' | 'nl' | 'ko';
  timezone: string | null;
  /** 0 = System, 1 = Light, 2 = Dark */
  theme: 0 | 1 | 2;
  /** Allow messages from non-friends */
  openMessage: boolean;
  createdAt: string;
}

/** Complete user object with relations */
export interface User {
  id: number;
  username: string;
  mail: string;
  twoFactorEnabled: boolean;
  /** User role (0 = regular user) */
  role?: UserRoleValue;
  /** User status (0 = active) */
  status?: number;
  /** OAuth fields */
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  /** Related entities */
  profile: UserProfile;
  settings: UserSettings;
}

/** DTO for updating user profile */
export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

/** DTO for updating user settings */
export interface UpdateSettingsDto {
  language?: 'en' | 'fr' | 'tr' | 'nl' | 'ko';
  timezone?: string;
  theme?: 0 | 1 | 2;
  openMessage?: boolean;
}

/** Theme enum for better readability */
export enum Theme {
  System = 0,
  Light = 1,
  Dark = 2,
}

/** User role constants */
export const UserRole = { USER: 0, ADMIN: 1, MODERATOR: 2, BOT: 999 } as const
export type UserRoleValue = typeof UserRole[keyof typeof UserRole]

/** Language options */
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'tr', 'nl', 'ko'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
