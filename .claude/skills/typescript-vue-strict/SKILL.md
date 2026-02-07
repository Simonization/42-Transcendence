# TypeScript + Vue Strict Mode

Enforce strict TypeScript checking in Vue projects for better type safety and fewer runtime errors.

## Strict TypeScript Config

Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Typing Composables

Always provide explicit return types for composables:

**❌ No Return Type:**
```ts
export const useUser = () => {
  const user = ref({
    id: '',
    email: '',
    name: '',
  })

  const fetchUser = async (id: string) => {
    const response = await api.get(`/users/${id}`)
    user.value = response.data
  }

  return { user, fetchUser }
  // No type information for return value
}
```

**✅ With Return Type:**
```ts
interface User {
  id: string
  email: string
  name: string
}

interface UseUserReturn {
  user: Ref<User>
  fetchUser: (id: string) => Promise<void>
  isLoading: Ref<boolean>
}

export const useUser = (): UseUserReturn => {
  const user = ref<User>({
    id: '',
    email: '',
    name: '',
  })

  const isLoading = ref(false)

  const fetchUser = async (id: string): Promise<void> => {
    isLoading.value = true
    try {
      const response = await api.get<User>(`/users/${id}`)
      user.value = response.data
    } finally {
      isLoading.value = false
    }
  }

  return { user, fetchUser, isLoading }
}
```

## Typing API Responses

Always type API responses - never use `any`:

**❌ No Types:**
```ts
const response = await api.get('/users/me')
const user = response.data // any - loses type info
```

**✅ With Types:**
```ts
interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

const response = await api.get<AuthResponse>('/users/me')
// response.data is typed as AuthResponse
const user = response.data.user // User type
const token = response.data.token // string type
```

**Create types file:**
```ts
// types/api.ts
export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface Friend {
  id: string
  name: string
  status: 'pending' | 'accepted' | 'blocked'
}

export interface Message {
  id: string
  content: string
  userId: string
  roomId: string
  createdAt: Date
}

export interface ChatRoom {
  id: string
  name: string
  participants: User[]
  messages: Message[]
}

export interface ApiErrorResponse {
  statusCode: number
  message: string
  code: string
}
```

## Typed Error Handling

Never use bare `catch (e)` - use type guards:

**❌ Bad:**
```ts
try {
  await api.post('/users', userData)
} catch (e) {
  console.log(e.message) // Property 'message' does not exist on type 'unknown'
}
```

**✅ Good:**
```ts
try {
  await api.post('/users', userData)
} catch (error) {
  if (error instanceof AxiosError) {
    console.log(error.response?.data.message)
  } else if (error instanceof Error) {
    console.log(error.message)
  } else {
    console.log('Unknown error type')
  }
}

// Or use helper:
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

try {
  await api.post('/users', userData)
} catch (error) {
  const message = getErrorMessage(error)
  showToast(message, 'error')
}
```

## Vue Component Props & Emits

Always type props and emits properly:

**❌ Implicit Types:**
```vue
<script setup>
const props = defineProps({
  user: Object,
  isActive: Boolean,
})

const emit = defineEmits(['update', 'delete'])
</script>
```

**✅ Explicit Types:**
```vue
<script setup lang="ts">
import type { User } from '@/types/api'

interface Props {
  user: User
  isActive?: boolean
  readonly?: boolean
}

interface Emits {
  (e: 'update', user: User): void
  (e: 'delete', userId: string): void
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  readonly: false,
})

const emit = defineEmits<Emits>()

// Type-safe usage:
emit('update', props.user) // ✅ Correct
emit('delete', '123') // ✅ Correct
emit('update', 'wrong') // ❌ TypeScript error
</script>
```

## Computed & Watchers

Type computed values and watch callbacks:

```ts
import type { ComputedRef, Ref } from 'vue'

interface UserStats {
  totalFriends: number
  messageCount: number
}

const user: Ref<User> = ref({...})
const messageCount: Ref<number> = ref(0)

// Computed with explicit type
const userStats: ComputedRef<UserStats> = computed(() => ({
  totalFriends: user.value.friends.length,
  messageCount: messageCount.value,
}))

// Watcher with typed callback
watch(
  () => user.value.id,
  async (newId: string, oldId: string | undefined) => {
    console.log(`User changed from ${oldId} to ${newId}`)
    await fetchUserData(newId)
  }
)

// Watcher with options
watch(
  messageCount,
  (newCount: number) => {
    if (newCount > 100) {
      showNotification('Many messages!')
    }
  },
  { immediate: true }
)
```

## Generic Types for Reusable Logic

Use generics for flexible, type-safe utilities:

**❌ Limited to one type:**
```ts
const fetchUsers = async (): Promise<User[]> => {
  const response = await api.get('/users')
  return response.data
}

const fetchFriends = async (): Promise<Friend[]> => {
  const response = await api.get('/friends')
  return response.data
}
```

**✅ Generic, reusable:**
```ts
const fetchData = async <T>(url: string): Promise<T> => {
  const response = await api.get<T>(url)
  return response.data
}

const users = await fetchData<User[]>('/users')
const friends = await fetchData<Friend[]>('/friends')
const room = await fetchData<ChatRoom>('/rooms/123')
```

**Generic composable:**
```ts
interface UseApiState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  fetch: () => Promise<void>
}

export const useApi = <T>(
  url: string,
  options?: { immediate?: boolean }
): UseApiState<T> => {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const fetch = async () => {
    loading.value = true
    try {
      const response = await api.get<T>(url)
      data.value = response.data
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  if (options?.immediate) {
    fetch()
  }

  return { data, loading, error, fetch }
}

// Usage - type-safe
const { data: user, loading } = useApi<User>('/users/me', { immediate: true })
const { data: rooms } = useApi<ChatRoom[]>('/rooms')
```

## Common Fixes for This Project

### 1. Implicit `any` in catch blocks
**Find:**
```ts
try {
} catch (e) {
  // e is 'unknown' or 'any'
}
```

**Fix:**
```ts
try {
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message)
  }
}
```

### 2. Untyped composable state
**Current:**
```ts
const user = ref({})
const friends = ref([])
const token = ref('')
```

**Fix:**
```ts
const user = ref<User | null>(null)
const friends = ref<Friend[]>([])
const token = ref<string>('')
```

### 3. Missing return types on async functions
**Current:**
```ts
const fetchData = async (id: string) => {
  const response = await api.get(`/data/${id}`)
  return response.data
}
```

**Fix:**
```ts
const fetchData = async (id: string): Promise<User> => {
  const response = await api.get<User>(`/data/${id}`)
  return response.data
}
```

## TypeScript Checking in CI/CD

Add type checking to your build pipeline:

```bash
# Check types without building
npx vue-tsc --noEmit

# In package.json
"type-check": "vue-tsc --noEmit"
```

Add to CI:
```yaml
# .github/workflows/check.yml
- name: Type check
  run: npm run type-check
```

## References

- [TypeScript Handbook: Strict Mode](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html#strict-type-checking-options)
- [Vue 3 + TypeScript Guide](https://vuejs.org/guide/typescript/overview.html)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
