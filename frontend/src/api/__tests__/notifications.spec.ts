/**
 * Notifications API Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notificationsApi } from '../notifications'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should fetch notifications with no params', async () => {
      const mockResponse = { notifications: [], total: 0 }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await notificationsApi.getNotifications()

      expect(mockApi).toHaveBeenCalledWith('/notifications', {
        method: 'GET',
        auth: true,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should fetch unread notifications only', async () => {
      const mockResponse = { notifications: [{ id: 1, body: 'Hello', readAt: null }], total: 1 }
      mockApi.mockResolvedValueOnce(mockResponse)

      const result = await notificationsApi.getNotifications({ unreadOnly: true })

      expect(mockApi).toHaveBeenCalledWith('/notifications?unreadOnly=true', {
        method: 'GET',
        auth: true,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should filter by type', async () => {
      mockApi.mockResolvedValueOnce({ notifications: [], total: 0 })

      await notificationsApi.getNotifications({ type: 'friend_request' })

      expect(mockApi).toHaveBeenCalledWith('/notifications?type=friend_request', {
        method: 'GET',
        auth: true,
      })
    })

    it('should support pagination params', async () => {
      mockApi.mockResolvedValueOnce({ notifications: [], total: 0 })

      await notificationsApi.getNotifications({ page: 2, limit: 10 })

      const calledUrl = (mockApi.mock.calls[0][0] as string)
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('limit=10')
    })
  })

  describe('getUnreadCount', () => {
    it('should fetch unread notification count', async () => {
      mockApi.mockResolvedValueOnce({ count: 5 })

      const result = await notificationsApi.getUnreadCount()

      expect(mockApi).toHaveBeenCalledWith('/notifications/unread-count', {
        method: 'GET',
        auth: true,
      })
      expect(result).toEqual({ count: 5 })
    })
  })

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await notificationsApi.markAsRead(42)

      expect(mockApi).toHaveBeenCalledWith('/notifications/42/read', {
        method: 'POST',
        auth: true,
      })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await notificationsApi.markAllAsRead()

      expect(mockApi).toHaveBeenCalledWith('/notifications/read-all', {
        method: 'POST',
        auth: true,
      })
    })
  })

  describe('deleteNotification', () => {
    it('should delete a notification by id', async () => {
      mockApi.mockResolvedValueOnce(undefined)

      await notificationsApi.deleteNotification(42)

      expect(mockApi).toHaveBeenCalledWith('/notifications/42', {
        method: 'DELETE',
        auth: true,
      })
    })
  })

  describe('sendNotification', () => {
    it('should send a notification', async () => {
      const mockNotif = { id: 1, userId: 5, type: 'info', body: 'Test', createdAt: '2026-02-25T00:00:00Z', updatedAt: '2026-02-25T00:00:00Z' }
      mockApi.mockResolvedValueOnce(mockNotif)

      const dto = {
        userId: 5,
        type: 'info' as const,
        body: 'Test',
        title: 'Hello',
      }
      const result = await notificationsApi.sendNotification(dto)

      expect(mockApi).toHaveBeenCalledWith('/notifications/send', {
        method: 'POST',
        body: dto,
        auth: true,
      })
      expect(result).toEqual(mockNotif)
    })
  })
})
