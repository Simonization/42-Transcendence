/**
 * Admin API Module
 * Admin-only user management endpoints
 */

import { api } from './index'
import type { User } from '../types'

export interface AdminUsersResponse {
  users: User[]
  total: number
}

export interface AdminUpdateUserDto {
  username?: string
  displayName?: string
  status?: number
  banUnit?: 'hours' | 'days' | 'permanent'
  banValue?: number
  avatarUrl?: string | null
}

export const adminApi = {
  /**
   * List users with pagination and search (admin only)
   */
  getUsers: (params: { page?: number; limit?: number; q?: string } = {}): Promise<AdminUsersResponse> => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.q) query.set('q', params.q)
    const qs = query.toString()
    return api<AdminUsersResponse>(`/users${qs ? `?${qs}` : ''}`)
  },

  /**
   * Update a user (admin only)
   */
  updateUser: (userId: number, data: AdminUpdateUserDto): Promise<User> => {
    return api<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: data,
    })
  },
}

export default adminApi
