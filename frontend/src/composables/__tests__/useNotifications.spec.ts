/**
 * useNotifications Composable Unit Tests
 * Tests the singleton notification state manager (toast system)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotifications } from '../useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    // Clear singleton state before each test
    const { clearAll } = useNotifications()
    clearAll()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addNotification', () => {
    it('should add a notification with correct fields', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('success', 'Operation complete', 5000)

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('success')
      expect(notifications.value[0].message).toBe('Operation complete')
      expect(notifications.value[0].duration).toBe(5000)
    })

    it('should return a unique id for each notification', () => {
      const { addNotification } = useNotifications()

      const id1 = addNotification('info', 'First')
      const id2 = addNotification('info', 'Second')

      expect(id1).not.toBe(id2)
    })

    it('should auto-dismiss after duration', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('info', 'Auto dismiss', 1000)
      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(notifications.value).toHaveLength(0)
    })

    it('should not auto-dismiss when duration is 0', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('info', 'No dismiss', 0)
      vi.advanceTimersByTime(10000)

      expect(notifications.value).toHaveLength(1)
    })

    it('should drop oldest notification when at max (3)', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('info', 'First', 0)
      addNotification('info', 'Second', 0)
      addNotification('info', 'Third', 0)
      expect(notifications.value).toHaveLength(3)

      addNotification('info', 'Fourth', 0)

      // Should drop oldest and keep 3
      expect(notifications.value).toHaveLength(3)
      expect(notifications.value.map(n => n.message)).not.toContain('First')
      expect(notifications.value.map(n => n.message)).toContain('Fourth')
    })
  })

  describe('removeNotification', () => {
    it('should remove a notification by id', () => {
      const { notifications, addNotification, removeNotification } = useNotifications()

      const id = addNotification('info', 'Remove me', 0)
      expect(notifications.value).toHaveLength(1)

      removeNotification(id)
      expect(notifications.value).toHaveLength(0)
    })

    it('should not throw when removing non-existent id', () => {
      const { removeNotification } = useNotifications()
      expect(() => removeNotification('does-not-exist')).not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      const { notifications, addNotification, clearAll } = useNotifications()

      addNotification('info', 'A', 0)
      addNotification('error', 'B', 0)
      addNotification('success', 'C', 0)

      clearAll()
      expect(notifications.value).toHaveLength(0)
    })
  })

  describe('convenience methods', () => {
    it('success() should add a success notification', () => {
      const { notifications, success } = useNotifications()

      success('Done!')

      expect(notifications.value[0].type).toBe('success')
      expect(notifications.value[0].message).toBe('Done!')
    })

    it('error() should add an error notification', () => {
      const { notifications, error } = useNotifications()

      error('Something went wrong')

      expect(notifications.value[0].type).toBe('error')
    })

    it('warning() should add a warning notification', () => {
      const { notifications, warning } = useNotifications()

      warning('Watch out')

      expect(notifications.value[0].type).toBe('warning')
    })

    it('info() should add an info notification', () => {
      const { notifications, info } = useNotifications()

      info('FYI')

      expect(notifications.value[0].type).toBe('info')
    })

    it('should use default duration when none specified', () => {
      const { notifications, info } = useNotifications()

      info('Default duration')

      expect(notifications.value[0].duration).toBe(3000)
    })

    it('should use custom duration when provided', () => {
      const { notifications, success } = useNotifications()

      success('Custom', 8000)

      expect(notifications.value[0].duration).toBe(8000)
    })
  })
})
