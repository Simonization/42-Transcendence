/**
 * Organization Types
 * Types for the organization/team management system
 */

export interface Organization {
  id: number
  name: string
  description: string | null
  avatarUrl: string | null
  ownerId: number
  owner?: { id: number; username: string }
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface OrgMember {
  id: number
  userId: number
  orgId: number
  role: OrgRole
  joinedAt: string
  user: {
    id: number
    username: string
    avatarUrl?: string | null
  }
}

export enum OrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface CreateOrgDto {
  name: string
  description?: string
}

export interface UpdateOrgDto {
  name?: string
  description?: string
  avatarUrl?: string | null
}

export interface AddOrgMemberDto {
  userId: number
  role?: OrgRole
}
