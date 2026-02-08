/**
 * Two-Factor Authentication Composable
 * Manages 2FA enable/disable/verify flows
 */

import { ref } from 'vue'
import { usersApi } from '../api/users'
import { authApi } from '../api/auth'
import { useErrorHandler } from './useErrorHandler'

export function useTwoFactor() {
  const enabled = ref(false)
  const loading = ref(false)
  const showForm = ref(false)
  const code = ref('')
  const isFetching = ref(true)

  const { message, handleError, handleSuccess } = useErrorHandler()

  /**
   * Fetch current 2FA status from user profile
   */
  const fetchStatus = async (): Promise<void> => {
    isFetching.value = true
    try {
      const user = await usersApi.getMe()
      enabled.value = user.twoFactorEnabled || false
    } catch {
      // User not authenticated or error fetching
      enabled.value = false
    } finally {
      isFetching.value = false
    }
  }

  /**
   * Enable 2FA - sends code to user's email
   */
  const enable = async (): Promise<void> => {
    loading.value = true
    try {
      await authApi.enable2FA()
      handleSuccess('Code sent to email.')
      showForm.value = true
    } catch (error) {
      handleError(error, 'Network error!')
    } finally {
      loading.value = false
    }
  }

  /**
   * Confirm 2FA with code from email
   */
  const confirm = async (): Promise<void> => {
    loading.value = true
    try {
      await authApi.confirm2FA({ code: code.value })
      handleSuccess('2FA Enabled!')
      enabled.value = true
      showForm.value = false
      code.value = ''
    } catch (error) {
      handleError(error, 'Network error!')
    } finally {
      loading.value = false
    }
  }

  /**
   * Disable 2FA for current user
   */
  const disable = async (): Promise<void> => {
    loading.value = true
    try {
      await authApi.disable2FA()
      handleSuccess('2FA Disabled')
      enabled.value = false
      showForm.value = false
    } catch (error) {
      handleError(error, 'Network error!')
    } finally {
      loading.value = false
    }
  }

  return {
    enabled,
    loading,
    message,
    showForm,
    code,
    isFetching,
    fetchStatus,
    enable,
    confirm,
    disable,
  }
}
