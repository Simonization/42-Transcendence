/**
 * Error Handler Composable
 * Centralized error handling with message state management
 * Replaces duplicate try-catch patterns across components
 */

import { ref } from 'vue'
import { ApiError } from '../types'

export function useErrorHandler() {
  const message = ref('')
  const messageType = ref<'success' | 'error'>('success')

  /**
   * Handle error and set message state
   * Uses ApiError.message if available, otherwise uses fallback string
   */
  const handleError = (error: unknown, fallback: string): void => {
    messageType.value = 'error'
    message.value = error instanceof ApiError ? error.message : fallback
  }

  /**
   * Handle success and set message state
   */
  const handleSuccess = (msg: string): void => {
    messageType.value = 'success'
    message.value = msg
  }

  /**
   * Clear the message
   */
  const clearMessage = (): void => {
    message.value = ''
  }

  return {
    message,
    messageType,
    handleError,
    handleSuccess,
    clearMessage,
  }
}
