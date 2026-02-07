# Frontend Architecture

## Overview

**esportendence** is a tournament organizer for esports competitions, built as a full-stack web application. The frontend is built with:

- **Vue 3** with Composition API and `<script setup>` syntax
- **Vite 7** for development and bundling
- **Vue Router 4** for client-side routing
- **TypeScript** for type safety
- **Socket.io-client** for real-time WebSocket communication
- **Vitest** for unit testing

## Dependency Graph

```
index.html
    |
    v
src/main.ts
    |
    +-- assets/main.css --> themes/index.css
    |                           |
    |                           +-- tokens.css (design tokens)
    |                           +-- theme-stellar.css (light theme)
    |                           +-- theme-dragon.css (dark theme)
    |
    +-- composables/useTheme.ts (initTheme)
    |
    +-- App.vue --> RouterView
                        |
                        v
                router/index.ts
                        |
        +---------------+---------------+---------------+
        |               |               |               |
        v               v               v               v
    /auth/*         /menu           /menu/*         redirects
        |               |               |
        v               v               v
AuthPage.vue    MenuLayout.vue    UserCard.vue
VerifyEmailPage.vue    |          FriendCard.vue
TwoFactorPage.vue      |          ChatCard.vue
OAuthCallbackPage.vue  |          DevCard.vue
                       |
                       +-- ThemeToggle.vue
                       +-- RouterView (nested)
```

### Component Dependency Tree

```
MenuLayout.vue
    +-- useAuth() (singleton)
    +-- useTheme() (singleton)
    +-- ThemeToggle.vue
    +-- RouterView --> Card pages

UserCard.vue
    +-- ProfileSection.vue --> usersApi
    +-- SettingsSection.vue --> usersApi, useTheme
    +-- SecuritySection.vue --> useTwoFactor
    +-- ConfirmDialog.vue

FriendCard.vue
    +-- useFriends()
    +-- AddFriendInput.vue
    +-- FriendList.vue
    +-- FriendRequests.vue
    +-- BlockedUsers.vue

ChatCard.vue
    +-- useChat()
    +-- ChatRoomList.vue
    +-- ChatConversation.vue --> MessageBubble.vue
    +-- MessageInput.vue
```

## Data Flow

```
User Action
    |
    v
Vue Component (template @event)
    |
    v
Component Method (script setup)
    |
    v
Composable (useAuth, useChat, etc.)
    |
    v
API Module (authApi, chatApi, etc.)
    |
    v
Base API Client (api/index.ts)
    |
    +-- Adds Authorization header
    +-- Handles 401 with token refresh
    +-- Parses JSON response
    |
    v
Backend (/api/*)
    |
    v
Response
    |
    v
Composable updates reactive refs
    |
    v
Vue reactivity triggers template re-render
```

## Route Table

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/auth` | `AuthPage.vue` | No | Login/Register form |
| `/auth/verify-email` | `VerifyEmailPage.vue` | No | Email verification with token |
| `/auth/2fa` | `TwoFactorPage.vue` | No | 2FA code entry during login |
| `/auth/callback` | `OAuthCallbackPage.vue` | No | OAuth callback handler |
| `/menu` | `MenuLayout.vue` | Yes | Main menu shell (redirects to `/menu/user`) |
| `/menu/user` | `UserCard.vue` | Yes | Profile, settings, security, delete account |
| `/menu/friend` | `FriendCard.vue` | Yes | Friends list, requests, blocked users |
| `/menu/chat` | `ChatCard.vue` | Yes | Chat rooms and conversations |
| `/menu/dev` | `DevCard.vue` | Yes | Debug tools and environment info |
| `/login` | redirect | - | Legacy redirect to `/auth` |
| `/login-success` | redirect | - | Legacy redirect to `/auth/callback` |
| `/verify-email` | redirect | - | Legacy redirect to `/auth/verify-email` |
| `/verify-2fa` | redirect | - | Legacy redirect to `/auth/2fa` |
| `/` | redirect | - | Redirects to `/menu` |

### Route Guard

The router implements a global navigation guard that checks for `accessToken` in localStorage. Routes starting with `/auth/` are public; all others require authentication.

```typescript
router.beforeEach((to) => {
  const publicPaths = ['/auth', '/auth/verify-email', '/auth/2fa', '/auth/callback']
  const isPublic = publicPaths.includes(to.path) || to.path.startsWith('/auth/')
  const hasToken = !!localStorage.getItem('accessToken')

  if (!isPublic && !hasToken) {
    return '/auth'
  }
})
```

## Key Architectural Decisions

### 1. Singleton Composables

`useAuth` and `useTheme` use module-level refs to share state across all components:

```typescript
// Module-level (outside function) = singleton
const user = ref<User | null>(null)
const isAuthenticated = ref(false)

export function useAuth() {
  // Returns the same refs to every caller
  return { user: readonly(user), isAuthenticated: readonly(isAuthenticated), ... }
}
```

**Why:** Ensures consistent auth state across the entire app without prop drilling or a store library.

### 2. Separate API Layer

All HTTP communication goes through typed API modules (`api/auth.ts`, `api/users.ts`, etc.):

**Why:**
- Centralized error handling and token management
- Type-safe request/response interfaces
- Easy to mock in tests
- Single place to modify API calls

### 3. Dual Theme System

Two themes (Stellar/Dragon) implemented with CSS custom properties:

**Why:**
- Zero JavaScript at runtime for theme rendering
- All styling via design tokens, no hardcoded colors
- Theme toggle is instant (just changes `data-theme` attribute)
- Quantum Break-inspired distinctive visual identity

### 4. Token Refresh Strategy

The API client automatically handles 401 responses:

1. Detect 401 on authenticated request
2. Use refresh token to get new access token
3. Retry original request with new token
4. Queue concurrent requests during refresh

**Why:** Seamless user experience without session interruption.

### 5. WebSocket Approach

Chat uses a hybrid REST + WebSocket approach:

- REST API for fetching rooms, sending messages, CRUD operations
- WebSocket for real-time message push notifications
- Native WebSocket client (not Socket.io client library) for simplicity

## Module Boundaries

### Entry (`src/main.ts`, `src/App.vue`)
- Initializes Vue app
- Mounts router
- Calls `initTheme()` before mount to prevent flash

### Router (`src/router/index.ts`)
- Defines all routes with lazy-loaded components
- Implements auth navigation guard
- Handles legacy route redirects

### API Layer (`src/api/`)
- `index.ts`: Base fetch wrapper with auth, token refresh, error handling
- `auth.ts`: Authentication endpoints (login, register, 2FA, OAuth)
- `users.ts`: User profile and settings endpoints
- `chat.ts`: Chat rooms and messages endpoints
- `friends.ts`: Friends and blocks endpoints

### Types (`src/types/`)
- `index.ts`: Re-exports all types
- `api.ts`: ApiError class, RequestOptions, pagination types
- `auth.ts`: Login/register/2FA request/response types
- `user.ts`: User, UserProfile, UserSettings types
- `chat.ts`: ChatRoom, Message, ChatParticipant types
- `friend.ts`: Friend, Block types

### Composables (`src/composables/`)
- `useAuth.ts`: Authentication state (singleton)
- `useTheme.ts`: Theme management (singleton)
- `useChat.ts`: Chat state with WebSocket (instance per call)
- `useFriends.ts`: Friends/blocks state (instance per call)
- `useTwoFactor.ts`: 2FA enable/disable flow (instance per call)

### Components (`src/components/`)
- `ThemeToggle.vue`: Theme switcher button
- `common/`: Reusable UI (ConfirmDialog)
- `user/`: Profile, settings, security sections
- `friends/`: Friend list, requests, blocked users
- `chat/`: Room list, conversation, message bubble, input

### Pages (`src/pages/`)
- `auth/`: Login, register, verify email, 2FA, OAuth callback
- `menu/`: User, friend, chat, dev cards

### Layouts (`src/layouts/`)
- `MenuLayout.vue`: Main authenticated layout with nav

### Styles (`src/assets/`)
- `main.css`: Entry point, imports theme system
- `themes/`: Design tokens and theme definitions
