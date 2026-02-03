/**
 * Authentication Composable
 * Manages authentication state and actions
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usersApi } from '../api/users'
import { authApi } from '../api/auth'
import { getAccessToken } from '../api'
import type { User } from '../types'

export function useAuth() {
  const router = useRouter()
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
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
   * Logout current user and redirect to login
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
      router.push('/login')
    }
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    checkAuth,
    logout,
  }
}
