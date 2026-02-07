# File Index

## Summary

| Metric | Count |
|--------|-------|
| Total source files | 47 |
| Vue SFCs | 23 |
| TypeScript | 20 |
| CSS | 5 |
| Test files | 10 |
| Config files | 4 |
| Total lines (approx) | ~5,800 |

---

## By Module

### Entry & Config

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 14 | HTML entry point, mounts Vue to `#app` |
| `src/main.ts` | 12 | Vue app initialization, router setup, theme init |
| `src/App.vue` | 11 | Root component with RouterView |
| `package.json` | 35 | Dependencies and npm scripts |
| `vite.config.js` | 19 | Vite build configuration with Vue plugin |

---

### Router

| File | Lines | Purpose |
|------|-------|---------|
| `src/router/index.ts` | 77 | Route definitions, auth guard, legacy redirects |

---

### API Layer

| File | Lines | Purpose |
|------|-------|---------|
| `src/api/index.ts` | 236 | Base API client with auth, token refresh, error handling |
| `src/api/auth.ts` | 166 | Auth API (login, register, 2FA, OAuth) |
| `src/api/users.ts` | 64 | Users API (profile, settings, delete) |
| `src/api/chat.ts` | 81 | Chat API (rooms, messages) |
| `src/api/friends.ts` | 64 | Friends API (friends, blocks) |

---

### Types

| File | Lines | Purpose |
|------|-------|---------|
| `src/types/index.ts` | 65 | Type re-exports for convenient importing |
| `src/types/api.ts` | 61 | ApiError class, RequestOptions, pagination |
| `src/types/auth.ts` | 84 | Auth request/response types, TOKEN_KEYS |
| `src/types/user.ts` | 73 | User, UserProfile, UserSettings, DTOs |
| `src/types/chat.ts` | 53 | ChatRoom, Message, ChatParticipant, DTOs |
| `src/types/friend.ts` | 45 | Friend, Block, DTOs, FriendStatus enum |

---

### Composables

| File | Lines | Purpose |
|------|-------|---------|
| `src/composables/useAuth.ts` | 69 | Auth state singleton (checkAuth, logout) |
| `src/composables/useTheme.ts` | 89 | Theme management (Stellar/Dragon toggle) |
| `src/composables/useChat.ts` | 219 | Chat state with WebSocket support |
| `src/composables/useFriends.ts` | 109 | Friends and blocks state management |
| `src/composables/useTwoFactor.ts` | 114 | 2FA enable/disable/confirm flow |

---

### Components

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/ThemeToggle.vue` | 122 | Theme toggle button with animated indicator |
| `src/components/common/ConfirmDialog.vue` | 83 | Modal confirmation dialog (Teleport to body) |
| `src/components/user/ProfileSection.vue` | 225 | Profile display/edit (avatar, name, bio) |
| `src/components/user/SettingsSection.vue` | 212 | Settings form (language, theme, messages) |
| `src/components/user/SecuritySection.vue` | 161 | 2FA status and management UI |
| `src/components/friends/AddFriendInput.vue` | 56 | Add friend by ID input field |
| `src/components/friends/FriendList.vue` | 125 | Accepted friends list with actions |
| `src/components/friends/FriendRequests.vue` | 100 | Pending requests with accept/decline |
| `src/components/friends/BlockedUsers.vue` | 69 | Blocked users with unblock |
| `src/components/chat/ChatRoomList.vue` | 163 | Sidebar room list with preview |
| `src/components/chat/ChatConversation.vue` | 66 | Message display area with auto-scroll |
| `src/components/chat/MessageBubble.vue` | 136 | Individual message bubble (own/other) |
| `src/components/chat/MessageInput.vue` | 66 | Text input for sending messages |

---

### Pages

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/auth/AuthPage.vue` | 377 | Login/register form with OAuth |
| `src/pages/auth/VerifyEmailPage.vue` | 186 | Email verification via token |
| `src/pages/auth/TwoFactorPage.vue` | 313 | 2FA code entry during login |
| `src/pages/auth/OAuthCallbackPage.vue` | 88 | OAuth callback token handler |
| `src/pages/menu/UserCard.vue` | 132 | User profile/settings/security page |
| `src/pages/menu/FriendCard.vue` | 209 | Friends management with tabs |
| `src/pages/menu/ChatCard.vue` | 252 | Two-column chat interface |
| `src/pages/menu/DevCard.vue` | 335 | Developer debug tools |

---

### Layouts

| File | Lines | Purpose |
|------|-------|---------|
| `src/layouts/MenuLayout.vue` | 186 | Main menu layout (header, nav, content) |

---

### Styles

| File | Lines | Purpose |
|------|-------|---------|
| `src/assets/main.css` | 8 | CSS entry point, imports themes |
| `src/assets/themes/index.css` | 390 | Theme aggregator + utility classes |
| `src/assets/themes/tokens.css` | 145 | Design tokens (spacing, typography, etc.) |
| `src/assets/themes/theme-stellar.css` | 160 | Light theme (white bg, orange accent) |
| `src/assets/themes/theme-dragon.css` | 170 | Dark theme (navy bg, gold accent) |

---

### Tests

| File | Lines | Purpose |
|------|-------|---------|
| `src/api/__tests__/index.spec.ts` | 368 | API client tests (auth, errors, refresh) |
| `src/api/__tests__/auth.spec.ts` | 270 | Auth API tests (login, register, 2FA) |
| `src/api/__tests__/users.spec.ts` | 197 | Users API tests (getMe, update, delete) |
| `src/api/__tests__/chat.spec.ts` | 156 | Chat API tests (rooms, messages) |
| `src/api/__tests__/friends.spec.ts` | 119 | Friends API tests (friends, blocks) |
| `src/composables/__tests__/useAuth.spec.ts` | 209 | useAuth tests (checkAuth, logout, singleton) |
| `src/composables/__tests__/useTwoFactor.spec.ts` | 247 | useTwoFactor tests (enable, confirm, disable) |
| `src/composables/__tests__/useTheme.spec.ts` | 175 | useTheme tests (toggle, persist, initTheme) |
| `src/composables/__tests__/useChat.spec.ts` | 171 | useChat tests (rooms, messages, WebSocket) |
| `src/composables/__tests__/useFriends.spec.ts` | 163 | useFriends tests (fetch, add, remove, block) |

---

## Cross-Reference

### Components -> Composables

| Component | Uses Composables |
|-----------|------------------|
| `MenuLayout.vue` | `useAuth`, `useTheme` |
| `ThemeToggle.vue` | `useTheme` |
| `AuthPage.vue` | - (direct API calls) |
| `UserCard.vue` | `useAuth` |
| `SettingsSection.vue` | `useTheme` |
| `SecuritySection.vue` | `useTwoFactor` |
| `FriendCard.vue` | `useAuth`, `useFriends` |
| `ChatCard.vue` | `useAuth`, `useChat` |
| `DevCard.vue` | `useAuth`, `useTheme` |

### Composables -> API Modules

| Composable | Uses APIs |
|------------|-----------|
| `useAuth` | `usersApi.getMe`, `authApi.logout` |
| `useTwoFactor` | `usersApi.getMe`, `authApi.enable2FA/confirm2FA/disable2FA` |
| `useChat` | `chatApi.*` |
| `useFriends` | `friendsApi.*` |
| `useTheme` | - (localStorage only) |

### API Modules -> Types

| API Module | Uses Types |
|------------|------------|
| `api/index.ts` | `ApiError`, `RequestOptions`, `ApiErrorResponse`, `TOKEN_KEYS` |
| `api/auth.ts` | `LoginRequest`, `RegisterRequest`, `LoginResponse`, `AuthResponse`, `MessageResponse`, etc. |
| `api/users.ts` | `User`, `UserProfile`, `UserSettings`, `UpdateProfileDto`, `UpdateSettingsDto`, `MessageResponse` |
| `api/chat.ts` | `ChatRoom`, `Message`, `CreateRoomDto`, `SendMessageDto`, `EditMessageDto` |
| `api/friends.ts` | `Friend`, `Block`, `AddFriendDto`, `RemoveFriendDto`, `BlockUserDto`, `UnblockUserDto` |

### Pages -> Components

| Page | Uses Components |
|------|-----------------|
| `MenuLayout.vue` | `ThemeToggle` |
| `UserCard.vue` | `ProfileSection`, `SettingsSection`, `SecuritySection`, `ConfirmDialog` |
| `FriendCard.vue` | `AddFriendInput`, `FriendList`, `FriendRequests`, `BlockedUsers` |
| `ChatCard.vue` | `ChatRoomList`, `ChatConversation`, `MessageInput` |
| `ChatConversation.vue` | `MessageBubble` |

### CSS Imports

```
main.css
  |
  +-- themes/index.css
        |
        +-- tokens.css        (design tokens)
        +-- theme-stellar.css (light theme variables)
        +-- theme-dragon.css  (dark theme variables)
        +-- [utility classes] (buttons, cards, inputs, etc.)
```
