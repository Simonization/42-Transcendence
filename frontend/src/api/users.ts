/**
 * Users API Module
 * User profile and settings management
 */

import { api } from './index';
import type {
  User,
  UserProfile,
  UserSettings,
  UpdateProfileDto,
  UpdateSettingsDto,
  MessageResponse,
} from '../types';

/**
 * Users API methods
 */
export const usersApi = {
  /**
   * Get current authenticated user with profile and settings
   */
  getMe: (): Promise<User> => {
    return api<User>('/users/me');
  },

  /**
   * Update user profile (display name, bio, avatar)
   * @param userId - User ID
   * @param data - Profile update data
   */
  updateProfile: (userId: number, data: UpdateProfileDto): Promise<UserProfile> => {
    return api<UserProfile>(`/users/${userId}/profile`, {
      method: 'PATCH',
      body: data,
    });
  },

  /**
   * Update user settings (language, theme, timezone)
   * @param userId - User ID
   * @param data - Settings update data
   */
  updateSettings: (userId: number, data: UpdateSettingsDto): Promise<UserSettings> => {
    return api<UserSettings>(`/users/${userId}/settings`, {
      method: 'PATCH',
      body: data,
    });
  },

  /**
   * Delete user account
   * This is a destructive action
   * @param userId - User ID to delete
   */
  deleteAccount: (userId: number): Promise<MessageResponse> => {
    return api<MessageResponse>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

export default usersApi;
