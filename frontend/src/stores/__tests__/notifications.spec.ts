/**
 * Notifications Store Unit Tests
 * Tests for Pinia toast notification state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '../notifications'

describe('useNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with no notifications', () => {
      const store = useNotificationsStore()
      expect(store.notifications).toHaveLength(0)
    })
  })

  describe('addNotification', () => {
    it('should add a notification with correct type and message', () => {
      const store = useNotificationsStore()
      store.addNotification('success', 'Operation complete', 5000)

      expect(store.notifications).toHaveLength(1)
      expect(store.notifications[0].type).toBe('success')
      expect(store.notifications[0].message).toBe('Operation complete')
      expect(store.notifications[0].duration).toBe(5000)
    })

    it('should return a unique id per notification', () => {
      const store = useNotificationsStore()
      const id1 = store.addNotification('info', 'First', 0)
      const id2 = store.addNotification('info', 'Second', 0)
      expect(id1).not.toBe(id2)
    })

    it('should auto-dismiss after the specified duration', () => {
      const store = useNotificationsStore()
      store.addNotification('info', 'Auto dismiss', 2000)

      expect(store.notifications).toHaveLength(1)
      vi.advanceTimersByTime(2000)
      expect(store.notifications).toHaveLength(0)
    })

    it('should not auto-dismiss when duration is 0', () => {
      const store = useNotificationsStore()
      store.addNotification('info', 'Persistent', 0)
      vi.advanceTimersByTime(30000)
      expect(store.notifications).toHaveLength(1)
    })

    it('should drop oldest when limit of 3 is reached', () => {
      const store = useNotificationsStore()
      store.addNotification('info', 'First', 0)
      store.addNotification('info', 'Second', 0)
      store.addNotification('info', 'Third', 0)
      store.addNotification('info', 'Fourth', 0)

      expect(store.notifications).toHaveLength(3)
      expect(store.notifications.map(n => n.message)).not.toContain('First')
      expect(store.notifications.map(n => n.message)).toContain('Fourth')
    })
  })

  describe('removeNotification', () => {
    it('should remove notification by id', () => {
      const store = useNotificationsStore()
      const id = store.addNotification('info', 'Remove me', 0)
      store.removeNotification(id)
      expect(store.notifications).toHaveLength(0)
    })

    it('should be a no-op for unknown ids', () => {
      const store = useNotificationsStore()
      expect(() => store.removeNotification('unknown-id')).not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      const store = useNotificationsStore()
      store.addNotification('info', 'A', 0)
      store.addNotification('error', 'B', 0)
      store.clearAll()
      expect(store.notifications).toHaveLength(0)
    })
  })

  describe('convenience methods', () => {
    it('success() adds a success notification', () => {
      const store = useNotificationsStore()
      store.success('Great job!')
      expect(store.notifications[0].type).toBe('success')
      expect(store.notifications[0].message).toBe('Great job!')
    })

    it('error() adds an error notification', () => {
      const store = useNotificationsStore()
      store.error('Something broke')
      expect(store.notifications[0].type).toBe('error')
    })

    it('warning() adds a warning notification', () => {
      const store = useNotificationsStore()
      store.warning('Watch out')
      expect(store.notifications[0].type).toBe('warning')
    })

    it('info() adds an info notification', () => {
      const store = useNotificationsStore()
      store.info('FYI')
      expect(store.notifications[0].type).toBe('info')
    })

    it('should use 3s default duration', () => {
      const store = useNotificationsStore()
      store.info('Default')
      expect(store.notifications[0].duration).toBe(3000)
    })

    it('should accept custom duration', () => {
      const store = useNotificationsStore()
      store.success('Custom', 8000)
      expect(store.notifications[0].duration).toBe(8000)
    })
  })
})
