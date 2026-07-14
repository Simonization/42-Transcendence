import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrganizations } from '../useOrganizations'
import { organizationsApi } from '../../api/organizations'
import { OrgRole } from '../../types'

vi.mock('../../api/organizations', () => ({
  organizationsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  },
}))

const mockOrg = {
  id: 1,
  name: 'Test Org',
  description: 'A test organization',
  avatarUrl: null,
  ownerId: 42,
  memberCount: 3,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const mockMember = {
  id: 1,
  userId: 10,
  orgId: 1,
  role: OrgRole.MEMBER,
  joinedAt: '2026-01-01',
  user: { id: 10, username: 'alice' },
}

describe('useOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchOrganizations loads orgs', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValue([mockOrg])
    const { organizations, fetchOrganizations, isLoading } = useOrganizations(42)
    await fetchOrganizations()
    expect(organizations.value).toEqual([mockOrg])
    expect(isLoading.value).toBe(false)
  })

  it('fetchOrganizations falls back to demo data on error', async () => {
    vi.mocked(organizationsApi.getAll).mockRejectedValue(new Error('fail'))
    const { error, organizations, fetchOrganizations, demoMode } = useOrganizations(42)
    await fetchOrganizations()
    expect(demoMode.value).toBe(true)
    expect(error.value).toBe('')
    expect(organizations.value.length).toBeGreaterThan(0)
  })

  it('createOrg adds to list', async () => {
    vi.mocked(organizationsApi.create).mockResolvedValue(mockOrg)
    const { organizations, createOrg } = useOrganizations(42)
    const result = await createOrg({ name: 'Test Org' })
    expect(result).toEqual(mockOrg)
    expect(organizations.value).toHaveLength(1)
  })

  it('updateOrg updates in list and selectedOrg', async () => {
    const updated = { ...mockOrg, name: 'Updated' }
    vi.mocked(organizationsApi.getAll).mockResolvedValue([mockOrg])
    vi.mocked(organizationsApi.update).mockResolvedValue(updated)
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([])
    const { organizations, selectedOrg, fetchOrganizations, selectOrg, updateOrg } = useOrganizations(42)
    await fetchOrganizations()
    await selectOrg(mockOrg)
    await updateOrg(1, { name: 'Updated' })
    expect(organizations.value[0].name).toBe('Updated')
    expect(selectedOrg.value?.name).toBe('Updated')
  })

  it('deleteOrg removes from list', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValue([mockOrg])
    vi.mocked(organizationsApi.delete).mockResolvedValue(undefined)
    const { organizations, fetchOrganizations, deleteOrg } = useOrganizations(42)
    await fetchOrganizations()
    expect(organizations.value).toHaveLength(1)
    await deleteOrg(1)
    expect(organizations.value).toHaveLength(0)
  })

  it('selectOrg fetches members', async () => {
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([mockMember])
    const { selectedOrg, members, selectOrg } = useOrganizations(42)
    await selectOrg(mockOrg)
    expect(selectedOrg.value).toEqual(mockOrg)
    expect(members.value).toEqual([mockMember])
  })

  it('addMember pushes to members list', async () => {
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([])
    vi.mocked(organizationsApi.addMember).mockResolvedValue(mockMember)
    vi.mocked(organizationsApi.getAll).mockResolvedValue([{ ...mockOrg, memberCount: 0 }])
    const { members, fetchOrganizations, selectOrg, addMember, organizations } = useOrganizations(42)
    await fetchOrganizations()
    await selectOrg({ ...mockOrg, memberCount: 0 })
    await addMember(1, 10)
    expect(members.value).toHaveLength(1)
    expect(organizations.value[0].memberCount).toBe(1)
  })

  it('removeMember filters from members list', async () => {
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([mockMember])
    vi.mocked(organizationsApi.removeMember).mockResolvedValue(undefined)
    vi.mocked(organizationsApi.getAll).mockResolvedValue([mockOrg])
    const { members, fetchOrganizations, selectOrg, removeMember, organizations } = useOrganizations(42)
    await fetchOrganizations()
    await selectOrg(mockOrg)
    expect(members.value).toHaveLength(1)
    await removeMember(1, 10)
    expect(members.value).toHaveLength(0)
    expect(organizations.value[0].memberCount).toBe(2)
  })

  it('canManage is true for owner', async () => {
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([])
    const { canManage, selectOrg } = useOrganizations(42) // userId=42 matches ownerId
    await selectOrg(mockOrg)
    expect(canManage.value).toBe(true)
  })

  it('canManage is false for non-member', async () => {
    vi.mocked(organizationsApi.getMembers).mockResolvedValue([])
    const { canManage, selectOrg } = useOrganizations(99) // different userId
    await selectOrg(mockOrg)
    expect(canManage.value).toBe(false)
  })

  it('setSearch triggers fetch with query', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValue([])
    const { setSearch, searchQuery } = useOrganizations(42)
    await setSearch('test')
    expect(searchQuery.value).toBe('test')
    expect(organizationsApi.getAll).toHaveBeenCalledWith({ q: 'test' })
  })
})
