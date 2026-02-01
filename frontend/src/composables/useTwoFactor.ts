import { ref } from 'vue'

export function useTwoFactor() {
  const enabled = ref(false)
  const loading = ref(false)
  const message = ref('')
  const showForm = ref(false)
  const code = ref('')
  const isFetching = ref(true)

  const getToken = () => localStorage.getItem('accessToken')

  const fetchStatus = async () => {
    const token = getToken()
    if (!token) return
    isFetching.value = true
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        enabled.value = data.twoFactorEnabled || false
      }
    } finally { isFetching.value = false }
  }

  const enable = async () => {
    loading.value = true
    message.value = ''
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (res.ok) {
        message.value = '✓ Code sent to email.'
        showForm.value = true
      } else {
        message.value = `✗ Error: ${data.message}`
      }
    } catch { message.value = '✗ Network error!' }
    finally { loading.value = false }
  }

  const confirm = async () => {
    loading.value = true
    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code.value })
      })
      const data = await res.json()
      if (res.ok) {
        message.value = '✓ 2FA Enabled!'
        enabled.value = true
        showForm.value = false
        code.value = ''
      } else {
        message.value = `✗ Error: ${data.message}`
      }
    } catch { message.value = '✗ Network error!' }
    finally { loading.value = false }
  }

  const disable = async () => {
    loading.value = true
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        message.value = '✓ 2FA Disabled'
        enabled.value = false
        showForm.value = false
      }
    } catch { message.value = '✗ Network error!' }
    finally { loading.value = false }
  }

  return {
    enabled, loading, message, showForm, code, isFetching,
    fetchStatus, enable, confirm, disable
  }
}