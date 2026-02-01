import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useAuth() {
  const router = useRouter()
  const isAuthenticated = ref(false)

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      isAuthenticated.value = false
      return false
    }
    
    try {
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      isAuthenticated.value = response.ok
      return response.ok
    } catch (error) {
      isAuthenticated.value = false
      return false
    }
  }

  const logout = async () => {
    const token = localStorage.getItem('accessToken')
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (e) { console.error(e) } 
    finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      isAuthenticated.value = false
      router.push('/login')
    }
  }

  return { isAuthenticated, checkAuth, logout }
}