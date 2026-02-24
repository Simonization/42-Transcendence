/**
 * Organizations Composable
 * Manages organization list, CRUD, and member management
 */

import { ref, computed } from 'vue'
import { organizationsApi } from '../api/organizations'
import { getErrorMessage } from '../utils/error'
import type { Organization, OrgMember, CreateOrgDto, UpdateOrgDto } from '../types'
import { OrgRole } from '../types'

export function useOrganizations(currentUserId: number) {
  const organizations = ref<Organization[]>([])
  const selectedOrg = ref<Organization | null>(null)
  const members = ref<OrgMember[]>([])
  const isLoading = ref(false)
  const isLoadingMembers = ref(false)
  const error = ref('')
  const searchQuery = ref('')

  const myOrgs = computed(() =>
    organizations.value.filter(o => o.ownerId === currentUserId)
  )

  const currentUserRole = computed(() => {
    if (!selectedOrg.value) return null
    if (selectedOrg.value.ownerId === currentUserId) return OrgRole.OWNER
    const member = members.value.find(m => m.userId === currentUserId)
    return member?.role ?? null
  })

  const canManage = computed(() =>
    currentUserRole.value === OrgRole.OWNER || currentUserRole.value === OrgRole.ADMIN
  )

  const fetchOrganizations = async (q?: string) => {
    isLoading.value = true
    error.value = ''
    try {
      organizations.value = await organizationsApi.getAll(q ? { q } : undefined)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load organizations')
    } finally {
      isLoading.value = false
    }
  }

  const selectOrg = async (org: Organization) => {
    selectedOrg.value = org
    await fetchMembers(org.id)
  }

  const deselectOrg = () => {
    selectedOrg.value = null
    members.value = []
  }

  const fetchMembers = async (orgId: number) => {
    isLoadingMembers.value = true
    try {
      members.value = await organizationsApi.getMembers(orgId)
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to load members')
    } finally {
      isLoadingMembers.value = false
    }
  }

  const createOrg = async (data: CreateOrgDto) => {
    error.value = ''
    try {
      const org = await organizationsApi.create(data)
      organizations.value.unshift(org)
      return org
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to create organization')
      return null
    }
  }

  const updateOrg = async (id: number, data: UpdateOrgDto) => {
    error.value = ''
    try {
      const updated = await organizationsApi.update(id, data)
      const idx = organizations.value.findIndex(o => o.id === id)
      if (idx !== -1) organizations.value[idx] = updated
      if (selectedOrg.value?.id === id) selectedOrg.value = updated
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to update organization')
      return false
    }
  }

  const deleteOrg = async (id: number) => {
    error.value = ''
    try {
      await organizationsApi.delete(id)
      organizations.value = organizations.value.filter(o => o.id !== id)
      if (selectedOrg.value?.id === id) deselectOrg()
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to delete organization')
      return false
    }
  }

  const addMember = async (orgId: number, userId: number) => {
    error.value = ''
    try {
      const member = await organizationsApi.addMember(orgId, { userId })
      members.value.push(member)
      // Update member count
      const org = organizations.value.find(o => o.id === orgId)
      if (org) org.memberCount++
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to add member')
      return false
    }
  }

  const removeMember = async (orgId: number, userId: number) => {
    error.value = ''
    try {
      await organizationsApi.removeMember(orgId, userId)
      members.value = members.value.filter(m => m.userId !== userId)
      const org = organizations.value.find(o => o.id === orgId)
      if (org) org.memberCount = Math.max(0, org.memberCount - 1)
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to remove member')
      return false
    }
  }

  const setSearch = (q: string) => {
    searchQuery.value = q
    fetchOrganizations(q || undefined)
  }

  return {
    organizations,
    selectedOrg,
    members,
    isLoading,
    isLoadingMembers,
    error,
    searchQuery,
    myOrgs,
    currentUserRole,
    canManage,
    fetchOrganizations,
    selectOrg,
    deselectOrg,
    fetchMembers,
    createOrg,
    updateOrg,
    deleteOrg,
    addMember,
    removeMember,
    setSearch,
  }
}
