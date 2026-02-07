# Getting Started

## Prerequisites

- **Node.js:** ^20.19.0 or >=22.12.0
- **npm:** Included with Node.js
- **Docker:** For running the full stack (backend, database, nginx)

## Quick Start

### Frontend Only (Development)

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`. API calls are proxied to the backend at `/api/`.

### Full Stack (Docker)

From the project root:

```bash
make all       # Initial setup + start all services
make up        # Start services (after initial setup)
make down      # Stop services
```

Services:
- Frontend: https://localhost (via nginx)
- Backend API: https://localhost/api/
- pgAdmin: http://localhost:5050

## Development Workflow

### Running Frontend Only

```bash
cd frontend
npm install
npm run dev
```

Hot reload is enabled. Changes to `.vue`, `.ts`, and `.css` files trigger instant updates.

### Running Tests

```bash
cd frontend
npx vitest run          # Run all tests once
npm test                # Run in watch mode
npm run test:ui         # Vitest UI interface
npm run test:coverage   # Generate coverage report
```

### Building for Production

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`. Preview with:

```bash
npm run preview
```

### Linting

The frontend doesn't have ESLint configured separately. TypeScript checks are handled by Vite during build.

## Key Patterns

### Composable Singletons

For shared state across components, use module-level refs:

```typescript
// src/composables/useAuth.ts

// Module-level refs = shared singleton state
const user = ref<User | null>(null)
const isAuthenticated = ref(false)

export function useAuth() {
  const checkAuth = async () => {
    // Modifies the shared refs
    const userData = await usersApi.getMe()
    user.value = userData
    isAuthenticated.value = true
  }

  return {
    // Return readonly to prevent external mutation
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    checkAuth,
  }
}
```

**Usage in components:**

```typescript
// Both components share the same state
const { user, isAuthenticated } = useAuth()
```

### API Client Usage

All API calls go through typed functions:

```typescript
import { usersApi } from '@/api/users'
import { ApiError } from '@/types'

try {
  const user = await usersApi.getMe()
  console.log(user.username)
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status, error.message)
  }
}
```

### Adding a New Page

1. **Create the component** in `src/pages/`:

```typescript
// src/pages/menu/NewCard.vue
<script setup lang="ts">
// Your component logic
</script>

<template>
  <div class="card card-page">
    <!-- Content -->
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 720px;
}
</style>
```

2. **Add the route** in `src/router/index.ts`:

```typescript
{
  path: '/menu',
  component: () => import('../layouts/MenuLayout.vue'),
  children: [
    // ... existing routes
    {
      path: 'new',
      name: 'new',
      component: () => import('../pages/menu/NewCard.vue'),
    },
  ],
}
```

3. **Add navigation** in `MenuLayout.vue` (optional):

```typescript
const navItems = [
  // ... existing items
  { to: '/menu/new', label: 'NEW' },
]
```

### Adding a New API Endpoint

1. **Add types** in `src/types/`:

```typescript
// src/types/example.ts
export interface ExampleData {
  id: number
  name: string
}

export interface CreateExampleDto {
  name: string
}
```

2. **Export from index**:

```typescript
// src/types/index.ts
export { type ExampleData, type CreateExampleDto } from './example'
```

3. **Create API module**:

```typescript
// src/api/example.ts
import { api } from './index'
import type { ExampleData, CreateExampleDto } from '../types'

export const exampleApi = {
  getAll(): Promise<ExampleData[]> {
    return api<ExampleData[]>('/example')
  },

  create(data: CreateExampleDto): Promise<ExampleData> {
    return api<ExampleData>('/example', {
      method: 'POST',
      body: data,
    })
  },
}
```

4. **Create composable** (optional):

```typescript
// src/composables/useExample.ts
import { ref } from 'vue'
import { exampleApi } from '../api/example'
import type { ExampleData } from '../types'

export function useExample() {
  const items = ref<ExampleData[]>([])
  const isLoading = ref(false)

  const fetchItems = async () => {
    isLoading.value = true
    try {
      items.value = await exampleApi.getAll()
    } finally {
      isLoading.value = false
    }
  }

  return { items, isLoading, fetchItems }
}
```

### Theme-Aware Styling

Always use CSS custom properties for colors:

```css
/* Good - uses theme variables */
.my-component {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.my-component:hover {
  background: var(--bg-hover);
}

/* Bad - hardcoded colors */
.my-component {
  background: #ffffff;
  color: #1a1a1a;
}
```

Use utility classes when possible:

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary btn-sm">Small Secondary</button>
<span class="badge badge-success">Active</span>
<p class="text-secondary">Helper text</p>
```

### Testing Patterns

#### Testing API Modules

Mock the base `api` function:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exampleApi } from '../example'
import * as apiModule from '../index'

vi.mock('../index', async () => {
  const actual = await vi.importActual('../index')
  return {
    ...actual,
    api: vi.fn(),
  }
})

const mockApi = vi.mocked(apiModule.api)

describe('Example API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch all items', async () => {
    const mockData = [{ id: 1, name: 'Test' }]
    mockApi.mockResolvedValueOnce(mockData)

    const result = await exampleApi.getAll()

    expect(mockApi).toHaveBeenCalledWith('/example')
    expect(result).toEqual(mockData)
  })
})
```

#### Testing Composables

For singleton composables, reset modules between tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useAuth', () => {
  let useAuth: typeof import('../useAuth').useAuth

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()  // Reset singleton state
    const mod = await import('../useAuth')
    useAuth = mod.useAuth
  })

  it('should check auth', async () => {
    const { checkAuth, isAuthenticated } = useAuth()
    // Test implementation
  })
})
```

For instance composables, just call the function:

```typescript
import { useFriends } from '../useFriends'

it('should fetch friends', async () => {
  const { fetchFriends, friends } = useFriends()
  await fetchFriends(1)
  expect(friends.value).toHaveLength(1)
})
```

## Project Structure

```
frontend/
  docs/                    # Documentation (you are here)
  node_modules/            # Dependencies
  public/                  # Static assets (copied as-is)
  src/
    api/                   # API client modules
      __tests__/           # API tests
      index.ts             # Base API client
      auth.ts              # Auth endpoints
      users.ts             # User endpoints
      chat.ts              # Chat endpoints
      friends.ts           # Friends endpoints
    assets/                # CSS and static assets
      themes/              # Theme system
        index.css          # Entry + utilities
        tokens.css         # Design tokens
        theme-stellar.css  # Light theme
        theme-dragon.css   # Dark theme
      main.css             # Main CSS entry
    components/            # Reusable components
      common/              # Shared UI (dialogs, etc.)
      user/                # User-related sections
      friends/             # Friend components
      chat/                # Chat components
      ThemeToggle.vue      # Theme switcher
    composables/           # Vue composables
      __tests__/           # Composable tests
      useAuth.ts           # Auth state (singleton)
      useTheme.ts          # Theme management (singleton)
      useChat.ts           # Chat state
      useFriends.ts        # Friends state
      useTwoFactor.ts      # 2FA management
    layouts/               # Layout components
      MenuLayout.vue       # Main authenticated layout
    pages/                 # Page components
      auth/                # Authentication pages
      menu/                # Menu card pages
    router/                # Vue Router
      index.ts             # Route definitions
    types/                 # TypeScript types
      index.ts             # Re-exports all types
      api.ts               # API types
      auth.ts              # Auth types
      user.ts              # User types
      chat.ts              # Chat types
      friend.ts            # Friend types
    App.vue                # Root component
    main.ts                # Entry point
  index.html               # HTML template
  package.json             # Dependencies and scripts
  vite.config.js           # Vite configuration
  vitest.config.ts         # Vitest configuration (if present)
```

## Common Gotchas

### 1. Singleton Composable State

If you see stale state in tests, ensure you're using `vi.resetModules()`:

```typescript
beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../useAuth')
  useAuth = mod.useAuth
})
```

### 2. API Auth Header

By default, `api()` includes the auth header. For public endpoints, set `auth: false`:

```typescript
await api('/auth/login', { method: 'POST', body: data, auth: false })
```

### 3. Theme Flash on Load

`initTheme()` must be called before `createApp().mount()`:

```typescript
// main.ts
initTheme()  // Apply theme before Vue mounts
createApp(App).use(router).mount('#app')
```

### 4. CSS Variables in Scoped Styles

CSS custom properties work in scoped styles, but make sure the property is defined:

```css
/* This works */
.my-class { color: var(--text-primary); }

/* This fails silently if --my-custom isn't defined */
.my-class { color: var(--my-custom); }
```

### 5. Route Guard Timing

The auth guard runs before component mounting. If you need user data in a component, call `checkAuth()` in `onMounted`:

```typescript
onMounted(async () => {
  const valid = await checkAuth()
  if (!valid) router.push('/auth')
})
```

### 6. WebSocket Protocol

The chat WebSocket uses the native WebSocket API with Socket.io protocol messages. Messages are prefixed with packet types (e.g., `42` for event messages).

### 7. Token Refresh Race Condition

The API client queues requests during token refresh. Don't manually call refresh - the client handles 401s automatically.
