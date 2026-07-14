/**
 * RBAC Composable
 * Role-based access control helpers using auth store
 */

import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { UserRole } from '../types'

export function useRbac() {
  const authStore = useAuthStore()

  const userRole = computed(() => authStore.user?.role ?? UserRole.USER)
  const isSuperAdmin = computed(() => userRole.value === UserRole.SUPER_ADMIN)
  const isAdmin = computed(() => isSuperAdmin.value || userRole.value === UserRole.ADMIN)

  const hasRole = (role: number): boolean => userRole.value === role
  const canAccess = (requiredRole: number): boolean => userRole.value === requiredRole

  return {
    userRole,
    isAdmin,
    isSuperAdmin,
    hasRole,
    canAccess,
  }
}
