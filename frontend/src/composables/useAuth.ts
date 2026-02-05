/**
 * Authentication Composable (Singleton)
 * Module-level refs ensure state is shared across all components
 */

import { ref, readonly } from 'vue'
import { usersApi } from '../api/users'
import { authApi } from '../api/auth'
import { getAccessToken } from '../api'
import type { User } from '../types'

// Module-level shared state (singleton)
const user = ref<User | null>(null)
const isAuthenticated = ref(false)
const isLoading = ref(false)

export function useAuth() {
  /**
   * Check if user is authenticated by validating token with backend
   */
  const checkAuth = async (): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) {
      isAuthenticated.value = false
      user.value = null
      return false
    }

    isLoading.value = true
    try {
      const userData = await usersApi.getMe()
      user.value = userData
      isAuthenticated.value = true
      return true
    } catch {
      isAuthenticated.value = false
      user.value = null
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout current user and clear state
   * Caller is responsible for navigation after logout
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true
    try {
      await authApi.logout()
    } catch {
      // Ignore errors, tokens will be cleared anyway
    } finally {
      isAuthenticated.value = false
      user.value = null
      isLoading.value = false
    }
  }

  return {
    isAuthenticated: readonly(isAuthenticated),
    user: readonly(user),
    isLoading: readonly(isLoading),
    checkAuth,
    logout,
  }
}
