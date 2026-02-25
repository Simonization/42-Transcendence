/**
 * Base API Client
 * Centralized fetch wrapper with authentication and error handling
 */

import { ref } from 'vue';
import { ApiError, TOKEN_KEYS } from '../types';
import type { RequestOptions, ApiErrorResponse } from '../types';
import { useApiLogger } from '../composables/useApiLogger';

/** Reactive flag: true when backend is unreachable */
export const backendDown = ref(false);

const API_BASE = '/api';

/** Flag to prevent multiple simultaneous refresh attempts */
let isRefreshing = false;
/** Queue of requests waiting for token refresh */
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeToRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers that refresh is complete
 */
function onRefreshComplete(newToken: string): void {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

/**
 * Get the current access token from storage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Get the current refresh token from storage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Store tokens in localStorage
 */
export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

/**
 * Clear all tokens from storage
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Attempt to refresh the access token
 * @returns New access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid, clear tokens
      clearTokens();
      return null;
    }

    const data = await response.json();
    setTokens(data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Handle 401 response - attempt token refresh
 */
async function handle401<T>(
  endpoint: string,
  options: RequestOptions
): Promise<T | null> {
  if (isRefreshing) {
    // Wait for the ongoing refresh to complete
    return new Promise((resolve) => {
      subscribeToRefresh(async (newToken) => {
        // Retry the original request with new token
        const retryOptions = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        };
        try {
          const result = await api<T>(endpoint, { ...retryOptions, auth: false });
          resolve(result);
        } catch {
          resolve(null);
        }
      });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // Redirect to login
      window.location.href = '/auth';
      return null;
    }

    onRefreshComplete(newToken);

    // Retry the original request
    const retryOptions = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    };
    return await api<T>(endpoint, { ...retryOptions, auth: false });
  } finally {
    isRefreshing = false;
  }
}

/**
 * Main API function - generic fetch wrapper with auth support
 *
 * @param endpoint - API endpoint (e.g., '/users/me')
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws ApiError on non-2xx responses
 *
 * @example
 * // GET request with auth
 * const user = await api<User>('/users/me');
 *
 * @example
 * // POST request without auth
 * const response = await api<AuthResponse>('/auth/login', {
 *   method: 'POST',
 *   body: { username: 'test', password: 'test' },
 *   auth: false,
 * });
 */
export async function api<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, body, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth header if required
  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const startTime = performance.now();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Network error — backend unreachable
    backendDown.value = true;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server');
  }
  const duration = Math.round(performance.now() - startTime);

  // Backend responded — clear the flag
  backendDown.value = false;

  // Handle successful responses
  if (response.ok) {
    // Handle empty responses (204 No Content)
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    useApiLogger().addRestLog({
      method: fetchOptions.method || 'GET',
      endpoint,
      status: response.status,
      duration,
      requestBody: body,
      responseBody: parsed,
    });
    if (!text) {
      return {} as T;
    }
    return parsed;
  }

  // Handle 401 - attempt token refresh
  if (response.status === 401 && auth) {
    useApiLogger().addRestLog({
      method: fetchOptions.method || 'GET',
      endpoint,
      status: 401,
      duration,
      requestBody: body,
    });
    const retryResult = await handle401<T>(endpoint, options);
    if (retryResult !== null) {
      return retryResult;
    }
    // Refresh failed and user was redirected to login
    // Return a rejected promise to signal the auth failure without throwing
    // (The redirect is already in progress)
    return Promise.reject(new ApiError(401, 'SESSION_EXPIRED', 'Session expired'));
  }

  // Parse error response
  let errorData: ApiErrorResponse;
  try {
    errorData = await response.json();
  } catch {
    errorData = {
      statusCode: response.status,
      message: response.statusText || 'An error occurred',
    };
  }

  useApiLogger().addRestLog({
    method: fetchOptions.method || 'GET',
    endpoint,
    status: response.status,
    duration,
    requestBody: body,
    responseBody: errorData,
  });

  throw new ApiError(
    response.status,
    errorData.error || 'UNKNOWN_ERROR',
    errorData.message
  );
}
