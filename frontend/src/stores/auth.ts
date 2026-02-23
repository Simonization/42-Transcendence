/**
 * Authentication Store
 * Manages user authentication state and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usersApi } from '../api/users'
import { authApi } from '../api/auth'
import { getAccessToken } from '../api'
import { i18n } from '../i18n'
import { UserRole } from '../types'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)

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

      // Sync i18n locale with user's saved language preference
      if (userData.settings?.language) {
        i18n.global.locale.value = userData.settings.language
        localStorage.setItem('locale', userData.settings.language)
      }

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

  const isAdmin = computed(() => (user.value?.role ?? UserRole.USER) === UserRole.ADMIN)
  const hasRole = (role: number): boolean => (user.value?.role ?? UserRole.USER) === role

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    hasRole,
    checkAuth,
    logout,
  }
})
