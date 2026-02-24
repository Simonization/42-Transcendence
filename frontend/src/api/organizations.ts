/**
 * Organizations API
 * Endpoints for managing organizations/teams
 */

import { api } from './index'
import type {
  Organization,
  OrgMember,
  CreateOrgDto,
  UpdateOrgDto,
  AddOrgMemberDto,
} from '../types'

export const organizationsApi = {
  /**
   * List all organizations (with optional search)
   */
  getAll(params?: { q?: string }): Promise<Organization[]> {
    const query = params?.q ? `?q=${encodeURIComponent(params.q)}` : ''
    return api<Organization[]>(`/organizations${query}`)
  },

  /**
   * Get a single organization by ID
   */
  getById(id: number): Promise<Organization> {
    return api<Organization>(`/organizations/${id}`)
  },

  /**
   * Create a new organization
   */
  create(data: CreateOrgDto): Promise<Organization> {
    return api<Organization>('/organizations', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Update an organization
   */
  update(id: number, data: UpdateOrgDto): Promise<Organization> {
    return api<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: data,
    })
  },

  /**
   * Delete an organization
   */
  delete(id: number): Promise<void> {
    return api<void>(`/organizations/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get members of an organization
   */
  getMembers(orgId: number): Promise<OrgMember[]> {
    return api<OrgMember[]>(`/organizations/${orgId}/members`)
  },

  /**
   * Add a member to an organization
   */
  addMember(orgId: number, data: AddOrgMemberDto): Promise<OrgMember> {
    return api<OrgMember>(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Remove a member from an organization
   */
  removeMember(orgId: number, userId: number): Promise<void> {
    return api<void>(`/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    })
  },
}
