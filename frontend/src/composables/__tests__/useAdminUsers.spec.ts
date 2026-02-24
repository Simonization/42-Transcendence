/**
 * useAdminUsers Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as adminApiModule from '../../api/admin'

vi.mock('../../api/admin', () => ({
  adminApi: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
  },
}))

const mockGetUsers = vi.mocked(adminApiModule.adminApi.getUsers)
const mockUpdateUser = vi.mocked(adminApiModule.adminApi.updateUser)

import { useAdminUsers } from '../useAdminUsers'

const mockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  mail: 'test@test.com',
  twoFactorEnabled: false,
  role: 0,
  status: 0,
  profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' },
  settings: { userId: 1, language: 'en' as const, timezone: null, theme: 0 as const, openMessage: false, createdAt: '' },
  ...overrides,
})

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchUsers loads users from API', async () => {
    const user = mockUser()
    mockGetUsers.mockResolvedValueOnce({ users: [user], total: 1 })

    const { users, total, fetchUsers, isLoading, error } = useAdminUsers()
    await fetchUsers()

    expect(mockGetUsers).toHaveBeenCalledWith({ page: 1, limit: 20, q: undefined })
    expect(users.value).toEqual([user])
    expect(total.value).toBe(1)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBe('')
  })

  it('fetchUsers handles errors', async () => {
    mockGetUsers.mockRejectedValueOnce(new Error('Network error'))

    const { fetchUsers, error } = useAdminUsers()
    await fetchUsers()

    expect(error.value).toBe('Failed to load users')
  })

  it('setSearch resets page and fetches', async () => {
    mockGetUsers.mockResolvedValue({ users: [], total: 0 })

    const { setSearch, page } = useAdminUsers()
    page.value = 3
    await setSearch('test')

    expect(page.value).toBe(1)
    expect(mockGetUsers).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'test' })
  })

  it('banUser calls updateUser with status 1', async () => {
    const user = mockUser()
    const bannedUser = mockUser({ status: 1 })
    mockGetUsers.mockResolvedValueOnce({ users: [user], total: 1 })
    mockUpdateUser.mockResolvedValueOnce(bannedUser)

    const { fetchUsers, banUser, users } = useAdminUsers()
    await fetchUsers()
    await banUser(1)

    expect(mockUpdateUser).toHaveBeenCalledWith(1, { status: 1 })
    expect(users.value[0].status).toBe(1)
  })

  it('unbanUser calls updateUser with status 0', async () => {
    const user = mockUser({ status: 1 })
    const unbannedUser = mockUser({ status: 0 })
    mockGetUsers.mockResolvedValueOnce({ users: [user], total: 1 })
    mockUpdateUser.mockResolvedValueOnce(unbannedUser)

    const { fetchUsers, unbanUser, users } = useAdminUsers()
    await fetchUsers()
    await unbanUser(1)

    expect(mockUpdateUser).toHaveBeenCalledWith(1, { status: 0 })
    expect(users.value[0].status).toBe(0)
  })

  it('removeAvatar calls updateUser with null avatarUrl', async () => {
    const user = mockUser({ avatarUrl: 'http://example.com/pic.jpg' })
    const updatedUser = mockUser({ avatarUrl: null })
    mockGetUsers.mockResolvedValueOnce({ users: [user], total: 1 })
    mockUpdateUser.mockResolvedValueOnce(updatedUser)

    const { fetchUsers, removeAvatar, users } = useAdminUsers()
    await fetchUsers()
    await removeAvatar(1)

    expect(mockUpdateUser).toHaveBeenCalledWith(1, { avatarUrl: null })
    expect(users.value[0].avatarUrl).toBeNull()
  })

  it('editUsername calls updateUser with new username', async () => {
    const user = mockUser()
    const updatedUser = mockUser({ username: 'newname' })
    mockGetUsers.mockResolvedValueOnce({ users: [user], total: 1 })
    mockUpdateUser.mockResolvedValueOnce(updatedUser)

    const { fetchUsers, editUsername, users } = useAdminUsers()
    await fetchUsers()
    await editUsername(1, 'newname')

    expect(mockUpdateUser).toHaveBeenCalledWith(1, { username: 'newname' })
    expect(users.value[0].username).toBe('newname')
  })

  it('goToPage clamps to valid range', async () => {
    mockGetUsers.mockResolvedValue({ users: [], total: 50 })

    const { fetchUsers, goToPage, page, totalPages } = useAdminUsers()
    await fetchUsers()

    expect(totalPages.value).toBe(3) // 50 / 20 = 2.5 → 3

    await goToPage(0)
    expect(page.value).toBe(1)

    await goToPage(99)
    expect(page.value).toBe(3)
  })
})
