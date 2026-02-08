/**
 * useTwoFactor Composable Unit Tests
 * Tests for two-factor authentication management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useTwoFactor } from '../useTwoFactor'
import * as usersApiModule from '../../api/users'
import * as authApiModule from '../../api/auth'
import { ApiError } from '../../types'

// Mock the API modules
vi.mock('../../api/users', () => ({
  usersApi: {
    getMe: vi.fn(),
  },
}))

vi.mock('../../api/auth', () => ({
  authApi: {
    enable2FA: vi.fn(),
    confirm2FA: vi.fn(),
    disable2FA: vi.fn(),
  },
}))

const mockGetMe = vi.mocked(usersApiModule.usersApi.getMe)
const mockEnable2FA = vi.mocked(authApiModule.authApi.enable2FA)
const mockConfirm2FA = vi.mocked(authApiModule.authApi.confirm2FA)
const mockDisable2FA = vi.mocked(authApiModule.authApi.disable2FA)

describe('useTwoFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStatus', () => {
    it('should fetch and set 2FA enabled status', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        mail: 'test@test.com',
        twoFactorEnabled: true,
        profile: {} as any,
        settings: {} as any,
      }

      mockGetMe.mockResolvedValueOnce(mockUser)

      const { fetchStatus, enabled, isFetching } = useTwoFactor()

      expect(isFetching.value).toBe(true)

      await fetchStatus()

      expect(mockGetMe).toHaveBeenCalled()
      expect(enabled.value).toBe(true)
      expect(isFetching.value).toBe(false)
    })

    it('should set enabled to false when 2FA is not enabled', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        mail: 'test@test.com',
        twoFactorEnabled: false,
        profile: {} as any,
        settings: {} as any,
      }

      mockGetMe.mockResolvedValueOnce(mockUser)

      const { fetchStatus, enabled } = useTwoFactor()

      await fetchStatus()

      expect(enabled.value).toBe(false)
    })

    it('should handle errors when fetching status', async () => {
      mockGetMe.mockRejectedValueOnce(new Error('Network error!'))

      const { fetchStatus, enabled, isFetching } = useTwoFactor()

      await fetchStatus()

      expect(enabled.value).toBe(false)
      expect(isFetching.value).toBe(false)
    })
  })

  describe('enable', () => {
    it('should enable 2FA and show form', async () => {
      mockEnable2FA.mockResolvedValueOnce({ message: 'Code sent' })

      const { enable, message, showForm, loading } = useTwoFactor()

      await enable()

      expect(mockEnable2FA).toHaveBeenCalled()
      expect(message.value).toBe('Code sent to email.')
      expect(showForm.value).toBe(true)
      expect(loading.value).toBe(false)
    })

    it('should handle ApiError when enabling fails', async () => {
      const error = new ApiError(400, 'BAD_REQUEST', 'Invalid request')
      mockEnable2FA.mockRejectedValueOnce(error)

      const { enable, message, showForm } = useTwoFactor()

      await enable()

      expect(message.value).toBe('Invalid request')
      expect(showForm.value).toBe(false)
    })

    it('should handle network errors', async () => {
      mockEnable2FA.mockRejectedValueOnce(new Error('Network error!'))

      const { enable, message } = useTwoFactor()

      await enable()

      expect(message.value).toBe('Network error!')
    })

    it('should set loading state during enable', async () => {
      mockEnable2FA.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ message: 'Code sent' }), 100)
          })
      )

      const { enable, loading } = useTwoFactor()

      const promise = enable()
      expect(loading.value).toBe(true)

      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('confirm', () => {
    it('should confirm 2FA with code', async () => {
      mockConfirm2FA.mockResolvedValueOnce({ message: '2FA enabled' })

      const { confirm, code, message, enabled, showForm } = useTwoFactor()

      code.value = '123456'
      await confirm()

      expect(mockConfirm2FA).toHaveBeenCalledWith({ code: '123456' })
      expect(message.value).toBe('2FA Enabled!')
      expect(enabled.value).toBe(true)
      expect(showForm.value).toBe(false)
      expect(code.value).toBe('')
    })

    it('should handle ApiError when confirming fails', async () => {
      const error = new ApiError(400, 'INVALID_CODE', 'Invalid code')
      mockConfirm2FA.mockRejectedValueOnce(error)

      const { confirm, code, message } = useTwoFactor()

      code.value = '000000'
      await confirm()

      expect(message.value).toBe('Invalid code')
    })

    it('should handle network errors during confirm', async () => {
      mockConfirm2FA.mockRejectedValueOnce(new Error('Network error!'))

      const { confirm, code, message } = useTwoFactor()

      code.value = '123456'
      await confirm()

      expect(message.value).toBe('Network error!')
    })
  })

  describe('disable', () => {
    it('should disable 2FA', async () => {
      mockDisable2FA.mockResolvedValueOnce({ message: '2FA disabled' })

      const { disable, message, enabled, showForm } = useTwoFactor()

      // Set initial state
      enabled.value = true
      showForm.value = true

      await disable()

      expect(mockDisable2FA).toHaveBeenCalled()
      expect(message.value).toBe('2FA Disabled')
      expect(enabled.value).toBe(false)
      expect(showForm.value).toBe(false)
    })

    it('should handle ApiError when disabling fails', async () => {
      const error = new ApiError(403, 'FORBIDDEN', 'Not allowed')
      mockDisable2FA.mockRejectedValueOnce(error)

      const { disable, message } = useTwoFactor()

      await disable()

      expect(message.value).toBe('Not allowed')
    })

    it('should handle network errors during disable', async () => {
      mockDisable2FA.mockRejectedValueOnce(new Error('Network error!'))

      const { disable, message } = useTwoFactor()

      await disable()

      expect(message.value).toBe('Network error!')
    })

    it('should set loading state during disable', async () => {
      mockDisable2FA.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ message: '2FA disabled' }), 100)
          })
      )

      const { disable, loading } = useTwoFactor()

      const promise = disable()
      expect(loading.value).toBe(true)

      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle confirm with empty code', async () => {
      const { confirm, code, message } = useTwoFactor()
      code.value = ''

      mockConfirm2FA.mockRejectedValueOnce(
        new ApiError(400, 'INVALID_CODE', 'Code required')
      )

      await confirm()

      expect(message.value).toBe('Code required')
    })

    it('should handle confirm with invalid code format', async () => {
      const { confirm, code, message } = useTwoFactor()
      code.value = 'invalid'

      mockConfirm2FA.mockRejectedValueOnce(
        new ApiError(400, 'INVALID_FORMAT', 'Code must be 6 digits')
      )

      await confirm()

      expect(message.value).toBe('Code must be 6 digits')
    })

    it('should handle rapid enable calls', async () => {
      mockEnable2FA.mockResolvedValue({ message: 'Code sent' })

      const { enable } = useTwoFactor()

      const [r1, r2, r3] = await Promise.all([
        enable(),
        enable(),
        enable(),
      ])

      expect(mockEnable2FA).toHaveBeenCalledTimes(3)
    })

    it('should handle confirm after failed attempt', async () => {
      const { confirm, code, message } = useTwoFactor()

      // First attempt fails
      code.value = '000000'
      mockConfirm2FA.mockRejectedValueOnce(
        new ApiError(400, 'INVALID_CODE', 'Invalid code')
      )
      await confirm()
      expect(message.value).toBe('Invalid code')

      // Second attempt succeeds
      code.value = '123456'
      mockConfirm2FA.mockResolvedValueOnce({ message: '2FA enabled' })
      await confirm()
      expect(message.value).toBe('2FA Enabled!')
    })

    it('should handle fetchStatus error gracefully', async () => {
      mockGetMe.mockRejectedValueOnce(new Error('Connection failed'))

      const { fetchStatus, enabled, isFetching } = useTwoFactor()

      await fetchStatus()

      expect(enabled.value).toBe(false)
      expect(isFetching.value).toBe(false)
    })

    it('should handle enable with network error', async () => {
      mockEnable2FA.mockRejectedValueOnce(new Error('Network error'))

      const { enable, message, loading } = useTwoFactor()

      await enable()

      expect(message.value).toBe('Network error!')
      expect(loading.value).toBe(false)
    })

    it('should clear code after successful confirm', async () => {
      mockConfirm2FA.mockResolvedValueOnce({ message: '2FA enabled' })

      const { confirm, code } = useTwoFactor()

      code.value = '123456'
      expect(code.value).toBe('123456')

      await confirm()

      expect(code.value).toBe('')
    })

    it('should handle disable error without throwing', async () => {
      mockDisable2FA.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Cannot disable 2FA')
      )

      const { disable, message } = useTwoFactor()

      await disable()

      expect(message.value).toBe('Cannot disable 2FA')
    })

    it('should handle fetchStatus with partial user object', async () => {
      mockGetMe.mockResolvedValueOnce({
        twoFactorEnabled: true,
        // Missing other required fields
      } as any)

      const { fetchStatus, enabled } = useTwoFactor()

      await fetchStatus()

      expect(enabled.value).toBe(true)
    })

    it('should handle multiple enable calls racing', async () => {
      mockEnable2FA.mockResolvedValue({ message: 'Code sent' })

      const { enable, message, showForm } = useTwoFactor()

      await Promise.all([enable(), enable()])

      expect(message.value).toBe('Code sent to email.')
      expect(showForm.value).toBe(true)
      expect(mockEnable2FA).toHaveBeenCalledTimes(2)
    })
  })
})
