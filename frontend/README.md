# Frontend - esportendence

Vue 3 + Vite frontend for the esportendence esports companion platform.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
src/
├── api/                 # API service layer
│   ├── index.ts         # Base API client with auth & token refresh
│   ├── auth.ts          # Authentication endpoints
│   ├── users.ts         # User management endpoints
│   ├── chat.ts          # Chat and messaging endpoints
│   └── friends.ts       # Friends and blocking endpoints
├── types/               # TypeScript interfaces
│   ├── api.ts           # API types (ApiError, RequestOptions)
│   ├── auth.ts          # Auth types (LoginRequest, AuthResponse)
│   └── user.ts          # User types (User, Profile, Settings)
├── composables/         # Vue composition utilities
│   ├── useAuth.ts       # Authentication state management
│   ├── useTwoFactor.ts  # 2FA flow management
│   ├── useChat.ts       # Chat and messaging state
│   ├── useFriends.ts    # Friends and blocking state
│   ├── useTheme.ts      # Theme switching and persistence
│   └── useShader.ts     # Shader effects utilities
├── components/          # Reusable Vue components
├── assets/
│   └── themes/          # Design tokens and theme CSS
├── layouts/             # Layout wrapper components
├── pages/               # Page-level components (routes)
├── utils/               # Utility functions
└── router/              # Vue Router configuration
```

## API Layer

The frontend uses a centralized API service layer with:

- **Automatic authentication** - Bearer token added to requests
- **Token refresh** - Automatic refresh on 401, with retry
- **Race condition handling** - Multiple concurrent 401s share single refresh
- **Type safety** - Full TypeScript coverage
- **Error handling** - Custom `ApiError` class with helper methods

### Usage

```typescript
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { ApiError } from '@/types'

// Login
const response = await authApi.login({ username, password })

// Get current user
const user = await usersApi.getMe()

// Handle errors
try {
  await authApi.enable2FA()
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isAuthError()) {
      // Handle 401
    } else if (error.isValidationError()) {
      // Handle 400
    }
  }
}
```

## Testing

Tests are written with Vitest and Vue Test Utils.

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| API Client | 22 | Pass |
| Auth API | 14 | Pass |
| Users API | 7 | Pass |
| Chat API | 18 | Pass |
| Friends API | 16 | Pass |
| useAuth | 7 | Pass |
| useTwoFactor | 14 | Pass |
| useChat | 9 | Pass |
| useFriends | 8 | Pass |
| **Total** | **115** | Pass |

## Implementation Status

### Phase 1: Foundation - Complete
- [x] API service layer (`/src/api/`)
- [x] TypeScript types (`/src/types/`)
- [x] Composables refactored to use API layer
- [x] Testing infrastructure (Vitest)
- [x] Unit tests (115 tests)

### Phase 2: Auth Module Connection - Complete
- [x] Update LoginPage.vue to use authApi
- [x] Update Dashboard.vue to use usersApi
- [x] Build Profile.vue page
- [x] Build Settings.vue page
- [x] Add /profile and /settings routes

### Phase 3: Friends Module - Complete
- [x] Create `/src/api/friends.ts`
- [x] Build Friends.vue page
- [x] Build friend components (list, requests, blocked)

### Phase 4: Chat Module - Complete
- [x] Create `/src/api/chat.ts`
- [x] Create useChat composable (WebSocket)
- [x] Build Chat.vue page and components

## Available Types

### User Types
```typescript
interface User {
  id: number
  username: string
  mail: string
  twoFactorEnabled: boolean
  profile: UserProfile
  settings: UserSettings
}

interface UserSettings {
  language: 'en' | 'fr' | 'tr' | 'nl' | 'ko'
  theme: 0 | 1 | 2  // System | Light | Dark
  timezone: string | null
  openMessage: boolean
}
```

### Auth Types
```typescript
type LoginResponse = AuthResponse | TwoFactorRequiredResponse

// Check if 2FA is required
import { requiresTwoFactor } from '@/types'
if (requiresTwoFactor(response)) {
  // Redirect to 2FA page
}
```

## Development

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

### Browser DevTools

- Chromium: [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Firefox: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

### Environment

- Node.js ^20.19.0 || >=22.12.0
- Vue 3.5+
- Vite 7+
- TypeScript

## Beta Testing

See the [Beta Testing Guide](../docs/BETA_TESTING_GUIDE.md) for test scenarios, known issues, and how to report bugs.

## Related Documentation

- [Frontend Development Guide](../docs/frontend_dev.md) - Detailed implementation guide
- [Backend Architecture](../docs/backend_architecture.md) - API endpoint documentation
