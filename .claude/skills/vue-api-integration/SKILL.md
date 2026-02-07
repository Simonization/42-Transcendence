# Vue API Integration & Auth Patterns

Secure API communication, token management, error handling, and auth flow patterns for Vue applications.

## Secure Token Validation (NOT Just Existence Check)

**❌ Current (Vulnerable):**
```js
const isAuthenticated = computed(() => localStorage.getItem('token') !== null)
// Problem: Token could be expired, invalid, or tampered with
```

**✅ Secure Approach:**
```js
// In useAuth.ts
import { jwtDecode } from 'jwt-decode'

export const useAuth = () => {
  const token = ref(localStorage.getItem('token'))

  const isTokenValid = () => {
    if (!token.value) return false

    try {
      const decoded = jwtDecode(token.value)
      const expiresAt = decoded.exp * 1000 // Convert to ms

      // Check if token is expired (with 1 minute buffer)
      const isExpired = Date.now() > expiresAt - 60000
      return !isExpired
    } catch {
      return false // Invalid token format
    }
  }

  const isAuthenticated = computed(() => isTokenValid())

  return { isAuthenticated, token }
}
```

**Auth Guard (with validation):**
```ts
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // Redirect to /auth, not /login (fix redirect bug)
    return next('/auth')
  }

  next()
})
```

## Token Refresh Pattern

Refresh tokens automatically before expiration to prevent interruptions.

**Setup:**
```ts
// api/index.ts
let refreshing = false
let refreshQueue = []

const queueRequest = (callback) => {
  refreshQueue.push(callback)
}

const processQueue = (token) => {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

export const createApiClient = () => {
  const instance = axios.create({
    baseURL: '/api',
  })

  // Request interceptor: Add token to every request
  instance.interceptors.request.use(
    (config) => {
      const { token } = useAuth()
      if (token.value) {
        config.headers.Authorization = `Bearer ${token.value}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor: Handle 401 + refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // 401 = Unauthorized (token expired or invalid)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        if (!refreshing) {
          refreshing = true

          try {
            const response = await axios.post('/api/auth/refresh', {
              refreshToken: localStorage.getItem('refreshToken'),
            })

            const { token } = response.data
            const { setToken } = useAuth()
            setToken(token)

            // Retry queued requests with new token
            processQueue(token)

            // Retry original request
            return instance(originalRequest)
          } catch (refreshError) {
            // Refresh failed → force logout
            const { logout } = useAuth()
            logout()
            router.push('/auth')
            return Promise.reject(refreshError)
          } finally {
            refreshing = false
          }
        } else {
          // Already refreshing → queue this request
          return new Promise((resolve) => {
            queueRequest((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(instance(originalRequest))
            })
          })
        }
      }

      return Promise.reject(error)
    }
  )

  return instance
}
```

## Error Handling Patterns

### Typed Error Handling
Don't catch bare errors - use typed exceptions:

**❌ Bad:**
```ts
try {
  const user = await api.get('/users/me')
} catch (e) {
  console.log(e)
}
```

**✅ Good:**
```ts
try {
  const user = await api.get('/users/me')
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      // Handle auth error
      router.push('/auth')
    } else if (error.response?.status === 404) {
      // Handle not found
      showToast('User not found', 'error')
    } else {
      // Handle other errors
      showToast(error.message, 'error')
    }
  } else if (error instanceof NetworkError) {
    showToast('Network error - check your connection', 'error')
  } else {
    showToast('Unknown error', 'error')
  }
}
```

### API Error Response Type
Define error structure on backend, use it everywhere:

```ts
// types/api.ts
export interface ApiErrorResponse {
  statusCode: number
  message: string
  code: string // Machine-readable error code
  details?: Record<string, any>
}

// In composable
const { error, loading, execute } = await api.post('/auth/login', credentials)
  .catch((err: AxiosError<ApiErrorResponse>) => {
    if (err.response?.data.code === 'INVALID_CREDENTIALS') {
      showToast('Email or password incorrect', 'error')
    } else if (err.response?.data.code === 'TOO_MANY_ATTEMPTS') {
      showToast('Too many login attempts. Try again in 15 minutes.', 'error')
    }
  })
```

## Composable API Pattern

Create reusable composables for common API operations:

```ts
// composables/useApiRequest.ts
export const useApiRequest = <T>(
  apiCall: () => Promise<T>,
  options = {}
) => {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  const execute = async () => {
    loading.value = true
    error.value = null

    try {
      data.value = await apiCall()
      return { data: data.value, error: null }
    } catch (e) {
      error.value = e
      return { data: null, error: e }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (options.immediate) execute()
  })

  return { data, error, loading, execute }
}

// Usage in component
const { data: user, loading, error, execute } = useApiRequest(
  () => api.get('/users/me'),
  { immediate: true }
)
```

## Request Retry Logic

Automatically retry failed requests with exponential backoff:

```ts
const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Only retry on network errors, not 4xx or 5xx
      if (
        error instanceof AxiosError &&
        error.response?.status &&
        error.response.status >= 400
      ) {
        throw error
      }

      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt))
        )
      }
    }
  }

  throw lastError
}

// Usage
const user = await retryRequest(
  () => api.get('/users/me'),
  3, // Try 3 times
  1000 // Start with 1s delay
)
```

## Testing API Integration

### Mocking API Calls
```ts
import { vi } from 'vitest'
import * as apiModule from '@/api'

// Mock entire API module
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// In test
it('should fetch user on mount', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    data: { id: 1, email: 'test@example.com' },
  })

  render(UserProfile)

  await nextTick()
  expect(screen.getByText('test@example.com')).toBeInTheDocument()
})

// Test error case
it('should show error on API failure', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(
    new AxiosError('Network error', 'ERR_NETWORK')
  )

  render(UserProfile)
  await nextTick()
  expect(screen.getByText(/Network error/)).toBeInTheDocument()
})
```

## Common Fixes for This Project

### 1. Fix Auth Guard (Token Validation)
Currently checks `localStorage.getItem('token')` - should validate token:

```ts
// Before: router/guards.ts
if (localStorage.getItem('token')) {
  next() // ❌ Token could be expired
}

// After:
const { isAuthenticated } = useAuth()
if (isAuthenticated.value) {
  next() // ✅ Token is actually valid
}
```

### 2. Fix 401 Redirect
Change redirect from `/login` to `/auth`:

```ts
// In api interceptor
if (error.response?.status === 401) {
  router.push('/auth') // ✅ Correct route
}
```

### 3. Add Error Code System
Backend should send `code` in error responses for frontend routing:

```ts
// Backend: NestJS
throw new UnauthorizedException({
  code: 'INVALID_CREDENTIALS',
  message: 'Email or password is incorrect',
})

// Frontend: Handle by code
if (err.response?.data.code === 'INVALID_CREDENTIALS') {
  showToast('Email or password incorrect')
} else if (err.response?.data.code === 'EMAIL_NOT_VERIFIED') {
  router.push('/auth/verify-email')
}
```

## Security Checklist

- [ ] Tokens validated before trusting (not just checked for existence)
- [ ] Expired tokens are refreshed automatically
- [ ] 401 responses redirect to `/auth`
- [ ] Tokens stored securely (httpOnly if possible, sessionStorage as fallback)
- [ ] No tokens logged in console/DevTools
- [ ] Error messages don't leak sensitive info to client
- [ ] CSRF tokens included in state-changing requests (POST/PUT/DELETE)
- [ ] Request timeouts configured (prevent hanging requests)

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Vue Best Practices: API Calls](https://vuejs.org/guide/essentials/lifecycle.html#lifecycle-diagram)
