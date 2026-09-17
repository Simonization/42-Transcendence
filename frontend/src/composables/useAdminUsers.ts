/**
 * Admin Users Composable
 * Manages admin user list, search, pagination, and actions
 */

import { ref, computed } from 'vue'
import { adminApi } from '../api/admin'
import type { AdminUpdateUserDto } from '../api/admin'
import { getErrorMessage } from '../utils/error'
import type { User } from '../types'

const PAGE_SIZE = 20

export function useAdminUsers() {
  const users = ref<User[]>([])
  const total = ref(0)
  const page = ref(1)
  const searchQuery = ref('')
  const isLoading = ref(false)
  const error = ref('')
  const demoMode = ref(false)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  const fetchUsers = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const res = await adminApi.getUsers({
        page: page.value,
        limit: PAGE_SIZE,
        q: searchQuery.value || undefined,
      })
      users.value = res.users
      total.value = res.total
    } catch (e) {
      users.value = []
      total.value = 0
      demoMode.value = true
      error.value = getErrorMessage(e, 'Failed to load users')
    } finally {
      isLoading.value = false
    }
  }

  const setSearch = (q: string) => {
    searchQuery.value = q
    page.value = 1
    fetchUsers()
  }

  const goToPage = (p: number) => {
    page.value = Math.max(1, Math.min(p, totalPages.value))
    fetchUsers()
  }

  const updateUser = async (userId: number, data: AdminUpdateUserDto) => {
    error.value = ''
    try {
      const updated = await adminApi.updateUser(userId, data)
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1) {
        users.value[idx] = updated
      }
      return true
    } catch (e) {
      error.value = getErrorMessage(e, 'Failed to update user')
      return false
    }
  }

  const banUser = (userId: number, options: { banUnit: 'hours' | 'days' | 'permanent'; banValue?: number }) =>
    updateUser(userId, { status: 1, banUnit: options.banUnit, banValue: options.banValue })

  const unbanUser = (userId: number) => updateUser(userId, { status: 0 })

  const removeAvatar = (userId: number) => updateUser(userId, { avatarUrl: null })

  const editUsername = (userId: number, username: string) => updateUser(userId, { username })
  const editDisplayName = (userId: number, displayName: string) => updateUser(userId, { displayName })

  return {
    users,
    total,
    page,
    searchQuery,
    isLoading,
    error,
    demoMode,
    totalPages,
    fetchUsers,
    setSearch,
    goToPage,
    banUser,
    unbanUser,
    removeAvatar,
    editUsername,
    editDisplayName,
  }
}
