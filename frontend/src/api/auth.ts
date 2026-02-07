/**
 * Auth API Module
 * All authentication-related API calls
 */

import { api, setTokens, clearTokens } from './index';
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  AuthResponse,
  RegisterResponse,
  MessageResponse,
  RefreshTokenResponse,
  Verify2FARequest,
  Confirm2FARequest,
} from '../types';

/**
 * Authentication API methods
 */
export const authApi = {
  /**
   * Login with username and password
   * Returns tokens or 2FA required response
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: data,
      auth: false,
    });

    // Store tokens if login successful (no 2FA required)
    if ('accessToken' in response) {
      setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },

  /**
   * Register a new user
   * Sends verification email
   */
  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return api<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: data,
      auth: false,
    });
  },

  /**
   * Logout current user
   * Clears tokens and invalidates refresh token on server
   */
  logout: async (): Promise<MessageResponse> => {
    try {
      const response = await api<MessageResponse>('/auth/logout', {
        method: 'POST',
      });
      return response;
    } finally {
      // Always clear tokens, even if request fails
      clearTokens();
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refresh: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });

    setTokens(response.accessToken);
    return response;
  },

  /**
   * Verify email with token from email link
   */
  verifyEmail: (token: string): Promise<MessageResponse> => {
    return api<MessageResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      auth: false,
    });
  },

  // ============================================
  // Two-Factor Authentication Methods
  // ============================================

  /**
   * Enable 2FA - sends verification code to email
   * User must be logged in
   */
  enable2FA: (): Promise<MessageResponse> => {
    return api<MessageResponse>('/auth/2fa/enable', {
      method: 'POST',
    });
  },

  /**
   * Confirm 2FA setup with code from email
   * Completes 2FA enablement
   */
  confirm2FA: (data: Confirm2FARequest): Promise<MessageResponse> => {
    return api<MessageResponse>('/auth/2fa/confirm', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Verify 2FA code during login
   * Returns tokens on success
   */
  verify2FA: async (data: Verify2FARequest): Promise<AuthResponse> => {
    const response = await api<AuthResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: data,
      auth: false,
    });

    // Store tokens after successful 2FA verification
    setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  /**
   * Disable 2FA for current user
   */
  disable2FA: (): Promise<MessageResponse> => {
    return api<MessageResponse>('/auth/2fa/disable', {
      method: 'POST',
    });
  },

  // ============================================
  // OAuth Methods
  // ============================================

  /**
   * Redirect to Google OAuth login
   * This navigates away from the app
   */
  googleLogin: (): void => {
    window.location.href = '/api/auth/google';
  },

  /**
   * Handle OAuth callback tokens
   * Called after redirect back from OAuth provider
   */
  handleOAuthCallback: (accessToken: string, refreshToken: string): void => {
    setTokens(accessToken, refreshToken);
  },
};

export default authApi;
