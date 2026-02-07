# Code Quality & Engineering Report

**Generated:** 2026-02-05
**Codebase:** esportendence frontend
**Framework:** Vue 3 + Vite + TypeScript

---

## Executive Summary

The esportendence frontend demonstrates **solid architectural foundations** with a well-organized structure separating API, composables, components, and types. The codebase consistently uses Vue 3 Composition API with `<script setup lang="ts">`, follows TypeScript conventions, and implements a clean theming system with CSS variables.

**Major Strengths:**
- Excellent type definitions with proper separation of concerns in `/types`
- Well-designed API layer with automatic token refresh and request queuing
- Good test coverage for API modules and composables (~115 tests)
- Clean CSS architecture using design tokens and theme-agnostic variables
- Proper use of singleton pattern for shared state (useAuth, useTheme)

**Major Concerns:**
- Auth guard only checks localStorage presence, not token validity
- Inconsistent composable design patterns (mutable refs vs readonly)
- Several hardcoded values (pixel dimensions, timeouts, magic numbers)
- No component tests, no router guard tests, no OAuth callback tests
- WebSocket implementation uses fragile raw protocol parsing

---

## Urgent Issues

### 1. Auth Guard Does Not Validate Token
**Severity:** HIGH
**File:** `/home/slang/42-Transcendence/frontend/src/router/index.ts:66-74`

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

**Problem:** The guard only checks if a token *exists* in localStorage, not if it's *valid*. An expired or corrupted token will pass this check, leading to protected routes loading with invalid credentials, then failing on first API call.

**Suggested Fix:** Either call `checkAuth()` from `useAuth` in the guard (making it async), or accept that the API layer's 401 handling will redirect. However, this causes a flash of the protected UI before redirect.

---

### 2. 401 Handler Redirects to `/login` Instead of `/auth`
**Severity:** MEDIUM
**File:** `/home/slang/42-Transcendence/frontend/src/api/index.ts:132`

```typescript
window.location.href = '/login';
```

**Problem:** The app's login route is `/auth`, but the API client redirects to `/login`. While there's a redirect rule from `/login` to `/auth`, this causes an unnecessary redirect hop and is inconsistent with the rest of the app.

**Suggested Fix:** Change to `window.location.href = '/auth';`

---

### 3. WebSocket Protocol Parsing Is Fragile
**Severity:** MEDIUM
**File:** `/home/slang/42-Transcendence/frontend/src/composables/useChat.ts:150-174`

```typescript
if (data.startsWith('42')) {
  try {
    const parsed = JSON.parse(data.slice(2))
    if (parsed[0] === 'message' && parsed[1]) {
```

**Problem:** This directly parses the Socket.io wire protocol (`42` prefix for message events). This is:
- Undocumented and could change between Socket.io versions
- Doesn't handle other message types (40=connect, 41=disconnect, etc.)
- Uses native WebSocket instead of Socket.io client library

**Suggested Fix:** Use the official Socket.io client library (`socket.io-client`) which handles protocol parsing automatically.

---

### 4. Unused Import in AuthPage
**Severity:** LOW
**File:** `/home/slang/42-Transcendence/frontend/src/pages/auth/AuthPage.vue:8`

```typescript
import type { User } from '../../types'
```

**Problem:** `User` type is imported but never used in the file.

**Suggested Fix:** Remove the unused import.

---

## Architecture Assessment

### Positive Patterns

1. **API Layer Design** (`/api/index.ts`)
   - Centralized fetch wrapper with automatic auth header injection
   - Token refresh with request queuing to prevent multiple simultaneous refreshes
   - Clean error handling with custom `ApiError` class

2. **Type System** (`/types/`)
   - Separate files for each domain: `auth.ts`, `user.ts`, `chat.ts`, `friend.ts`, `api.ts`
   - Central re-export via `index.ts`
   - Type guards like `requiresTwoFactor()` for discriminated unions

3. **Composable Organization** (`/composables/`)
   - Clear separation between singleton (useAuth, useTheme) and instance-based (useChat, useFriends) composables
   - Module-level refs for singletons ensures shared state

4. **Theme System** (`/assets/themes/`)
   - Well-structured CSS variable system with tokens and theme-specific values
   - Theme switching via `data-theme` attribute
   - Good use of semantic variable names

### Areas for Improvement

1. **No Pinia or Vuex**
   - State management relies on module-level refs in composables
   - Works fine for current scale but may need formalization as app grows

2. **Component Organization**
   - Pages contain business logic that could be extracted
   - Some components are tightly coupled to specific parent components

---

## Vue Best Practices Compliance

### Excellent

| Practice | Status |
|----------|--------|
| All components use `<script setup lang="ts">` | Pass |
| Props typed with `defineProps<T>()` | Pass |
| Emits typed with `defineEmits<T>()` | Pass |
| No Options API remnants | Pass |
| Proper use of `ref()`, `computed()`, `watch()` | Pass |
| Template refs properly typed | Pass |
| Lifecycle hooks used correctly | Pass |

### Concerns

1. **Mutable Prop Patterns**
   - `/home/slang/42-Transcendence/frontend/src/composables/useChat.ts:64` mutates room object directly:
   ```typescript
   const room = rooms.value.find(r => r.id === roomId)
   if (room) room.isUnread = false
   ```
   This mutates objects in the reactive array. While it works, it can cause subtle reactivity issues.

2. **No `v-memo` or Performance Optimizations**
   - Large list rendering in ChatRoomList, FriendList could benefit from `v-memo` for complex items

3. **Side Effects in Computed**
   - No violations found. All computed properties are pure.

---

## TypeScript Quality

### Good Practices

- No `any` casts in public API
- Proper interface definitions for all DTOs
- Type guards for discriminated unions (`requiresTwoFactor()`)
- Enum usage for status codes (`FriendStatus`, `ChatType`, `Theme`)

### Issues Found

| Issue | Location | Severity |
|-------|----------|----------|
| Implicit `any` in catch blocks | Multiple files | Medium |
| Empty catch blocks with no typing | `useChat.ts:171`, `DevCard.vue:49` | Low |

**Example - Implicit any in catch:**
```typescript
// /home/slang/42-Transcendence/frontend/src/composables/useChat.ts:41
} catch (e) {
  error.value = e instanceof ApiError ? e.message : 'Failed to load conversations'
}
```

The variable `e` is implicitly `unknown` which is correct, but the pattern `e instanceof ApiError` is repeated everywhere. Consider creating a helper:

```typescript
function getErrorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}
```

---

## Component Analysis

### Size Analysis

| Component | Lines | Assessment |
|-----------|-------|------------|
| `AuthPage.vue` | 377 | Large but justified - complete auth form with styling |
| `DevCard.vue` | 335 | Large but justified - debug/dev tool panel |
| `ChatCard.vue` | 252 | Acceptable |
| `TwoFactorPage.vue` | 313 | Acceptable - includes multiple states and styling |
| `SettingsSection.vue` | 212 | Acceptable |
| All other components | <200 | Good |

### Components That Could Be Split

1. **`AuthPage.vue`** could extract:
   - `AuthForm.vue` - the form inputs and validation
   - Keep `AuthPage.vue` as layout only

2. **`DevCard.vue`** could extract:
   - `BackendPingSection.vue`
   - `WebSocketTestSection.vue`
   - `AuthDebugSection.vue`

### Template Logic That Should Be Computed

**File:** `/home/slang/42-Transcendence/frontend/src/pages/menu/ChatCard.vue:97`
```html
{{ activeRoom.title || activeRoom.participants.find(p => p.id !== user?.id)?.username || 'Chat' }}
```

This complex expression with `.find()` in the template should be a computed property:

```typescript
const activeRoomTitle = computed(() => {
  if (!activeRoom.value) return 'Chat'
  return activeRoom.value.title
    || activeRoom.value.participants.find(p => p.id !== user.value?.id)?.username
    || 'Chat'
})
```

---

## Composable Design Review

### Singleton vs Instance Pattern Comparison

| Composable | Pattern | State Exposure | Notes |
|------------|---------|----------------|-------|
| `useAuth` | Singleton | `readonly()` refs | Correct pattern for shared auth state |
| `useTheme` | Singleton | Raw refs | Should use `readonly()` for consistency |
| `useChat` | Instance | Mutable refs | Each call creates new state - intentional |
| `useFriends` | Instance | Mutable refs | Each call creates new state - intentional |
| `useTwoFactor` | Instance | Mutable refs | Each call creates new state - intentional |

### Inconsistency Issue

**`useAuth`** returns readonly refs:
```typescript
return {
  isAuthenticated: readonly(isAuthenticated),
  user: readonly(user),
  isLoading: readonly(isLoading),
  ...
}
```

**`useTheme`** returns the raw ref:
```typescript
return {
  theme: currentTheme,  // Raw ref, not readonly
  ...
}
```

**Recommendation:** Either:
- Make `useTheme.theme` readonly and force changes through `setTheme()`
- Document the intentional difference

### Missing Cleanup in useChat

**File:** `/home/slang/42-Transcendence/frontend/src/composables/useChat.ts`

The WebSocket is stored in a local variable `let socket: WebSocket | null = null`. If `useChat()` is called multiple times without calling `disconnectSocket()`, orphaned connections could occur.

Consider using `onUnmounted` internally or documenting that callers must manage cleanup.

---

## Bug Risks

### 1. Race Condition in Room Selection
**Severity:** Medium
**File:** `/home/slang/42-Transcendence/frontend/src/composables/useChat.ts:51-69`

```typescript
const selectRoom = async (roomId: number) => {
  activeRoomId.value = roomId
  messages.value = []
  // ... async API call
}
```

If user rapidly clicks different rooms, the state could become inconsistent because `activeRoomId` is set immediately but messages are loaded async. The last-clicked room wins, but intermediate loading states may flash.

**Suggested Fix:** Add a request cancellation mechanism or check if `activeRoomId` matches after async operation completes.

---

### 2. Memory Leak Potential in DevCard
**Severity:** Low
**File:** `/home/slang/42-Transcendence/frontend/src/pages/menu/DevCard.vue:45-51`

```typescript
setTimeout(() => {
  ws?.close()
  ws = null
}, 3000)
```

If the component unmounts before the timeout fires, this could try to access cleaned-up state. The `onUnmounted` hook does close the socket, but the timeout callback remains.

**Suggested Fix:** Store the timeout ID and clear it in `onUnmounted`:
```typescript
let wsTimeout: ReturnType<typeof setTimeout> | null = null
// ...
wsTimeout = setTimeout(...)
// ...
onUnmounted(() => {
  if (wsTimeout) clearTimeout(wsTimeout)
  ws?.close()
})
```

---

### 3. OAuth Callback Stores Token Without Validation
**Severity:** Medium
**File:** `/home/slang/42-Transcendence/frontend/src/pages/auth/OAuthCallbackPage.vue:11-16`

```typescript
if (accessToken) {
  localStorage.setItem('accessToken', accessToken as string)
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken as string)
  }
  router.push('/menu')
}
```

The tokens from query params are stored directly without any validation. A malicious URL could inject invalid tokens.

**Suggested Fix:** Validate the token with the backend before storing, or at minimum ensure the callback URL is only accessible from legitimate OAuth redirects.

---

## Hardcoded Values Inventory

| Value | File | Line | Suggested Improvement |
|-------|------|------|----------------------|
| `520px` | `ChatCard.vue` | 136 | CSS variable `--chat-height` |
| `260px` | `ChatCard.vue` | 141 | CSS variable `--sidebar-width` |
| `40` chars | `ChatRoomList.vue` | 24 | Constant or CSS `text-overflow` |
| `3000ms` | `DevCard.vue` | 46 | Named constant `WS_TEST_TIMEOUT` |
| `800ms` | `AuthPage.vue` | 44 | Named constant `REDIRECT_DELAY` |
| `800ms` | `TwoFactorPage.vue` | 39 | Named constant `REDIRECT_DELAY` |
| `50` | `chatApi.getRooms` | 14 | Named constant or parameter |
| `20` | `chatApi.getMessages` | 30 | Named constant `DEFAULT_MESSAGE_LIMIT` |
| `100ms` | `DevCard.vue` | 82 | Named constant `TIMER_INTERVAL` |
| `6` | Multiple 2FA inputs | - | Named constant `2FA_CODE_LENGTH` |
| `#0a0e1a` | `AuthPage.vue` | 191 | CSS variable (hardcoded dark bg) |
| `#e8e6e3` | `AuthPage.vue` | 214 | CSS variable |
| `10px` | `MessageBubble.vue` | 99 | CSS variable `--text-2xs` |
| `420px` | `AuthPage.vue` | 197 | CSS variable `--auth-panel-width` |
| `64px` | Multiple components | - | CSS variable exists: `--space-16` |

### Auth Pages Use Hardcoded Colors Instead of Theme Variables

**Files:** `AuthPage.vue`, `TwoFactorPage.vue`, `VerifyEmailPage.vue`, `OAuthCallbackPage.vue`

These pages use hardcoded hex colors instead of theme CSS variables:
- `background: #0a0e1a` instead of `var(--bg-primary)`
- `color: #e8e6e3` instead of `var(--text-primary)`

This is intentional (auth is always dark), but should be documented or extracted to variables like `--auth-bg`.

---

## Redundancies & Simplification Opportunities

### 1. Repeated Error Handling Pattern

The same error handling code appears in every composable:

```typescript
// Appears in: useChat.ts, useFriends.ts, useTwoFactor.ts
} catch (e) {
  error.value = e instanceof ApiError ? e.message : 'Failed to ...'
}
```

**Suggestion:** Create a utility function:

```typescript
// utils/error.ts
export function handleApiError(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}

// Usage:
} catch (e) {
  error.value = handleApiError(e, 'Failed to load friends')
}
```

---

### 2. Duplicate Auth Page Styling

`AuthPage.vue`, `TwoFactorPage.vue`, `VerifyEmailPage.vue`, and `OAuthCallbackPage.vue` all have nearly identical:
- `.auth-page` styles
- `.auth-panel` styles
- `.state-container` styles
- `.spinner` styles

**Suggestion:** Extract to a shared `auth-layout.css` or create `AuthLayout.vue` wrapper component.

---

### 3. Repeated Section Styling

Every user section component (`ProfileSection.vue`, `SettingsSection.vue`, `SecuritySection.vue`) has:

```css
.section {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-4) 0;
}
```

**Suggestion:** Add to global utility classes in `index.css` or create `SectionContainer.vue`.

---

### 4. Language Labels Hardcoded

**File:** `/home/slang/42-Transcendence/frontend/src/components/user/SettingsSection.vue:25-31`

```typescript
const languageLabels: Record<string, string> = {
  en: 'English',
  fr: 'Francais',
  tr: 'Turkce',
  nl: 'Nederlands',
  ko: 'Korean',
}
```

**Issues:**
- No diacritics (should be "Francais" -> "Francais" or "Turkce" -> "Turkce")
- "Korean" should be "한국어" to match the pattern of native names
- Not using i18n system

**Suggestion:** Move to a constants file or i18n configuration.

---

## Test Coverage Analysis

### What IS Tested

| Area | Test File | Coverage |
|------|-----------|----------|
| API client base | `api/__tests__/index.spec.ts` | Token management, request handling, 401 refresh |
| Auth API | `api/__tests__/auth.spec.ts` | Login, register, logout, 2FA methods, OAuth |
| Users API | `api/__tests__/users.spec.ts` | getMe, updateProfile, updateSettings, deleteAccount |
| Chat API | `api/__tests__/chat.spec.ts` | All CRUD operations |
| Friends API | `api/__tests__/friends.spec.ts` | Friends and blocks operations |
| useAuth | `composables/__tests__/useAuth.spec.ts` | checkAuth, logout, singleton behavior |
| useTheme | `composables/__tests__/useTheme.spec.ts` | Theme switching, persistence |
| useChat | `composables/__tests__/useChat.spec.ts` | Room/message operations |
| useFriends | `composables/__tests__/useFriends.spec.ts` | Friend/block operations |
| useTwoFactor | `composables/__tests__/useTwoFactor.spec.ts` | Enable/confirm/disable flow |

**Total: ~115 tests across 10 test files**

### What ISN'T Tested

| Gap | Impact | Priority |
|-----|--------|----------|
| **No component tests** | UI regressions undetected | P1 |
| **No router guard tests** | Auth bypass possible | P1 |
| **No OAuth callback tests** | Token injection vulnerability | P1 |
| **No WebSocket tests** | Real-time features untested | P2 |
| **No E2E tests** | Full flow regressions | P2 |
| **No error boundary tests** | Unhandled errors crash app | P2 |

### Test Quality Assessment

**Strengths:**
- Good use of `vi.mock()` for isolating tests
- Tests cover both success and error paths
- Proper async/await handling
- Singleton reset pattern in useAuth tests is well done

**Weaknesses:**
- No snapshot tests for components
- No visual regression testing
- Edge cases like concurrent requests only partially tested
- No tests for user interactions (clicks, form submissions)

---

## Priority Recommendations

### P0 - Critical (Fix Immediately)

1. **Fix 401 redirect URL** in `api/index.ts` - change `/login` to `/auth`
2. **Remove unused `User` import** in `AuthPage.vue`
3. **Add token validation** to OAuth callback page before storing tokens

### P1 - Important (Fix This Sprint)

1. **Add component tests** - Start with auth components and critical user flows
2. **Add router guard tests** - Ensure protected routes are actually protected
3. **Use Socket.io client library** instead of raw WebSocket parsing
4. **Add request cancellation** to prevent race conditions in room selection
5. **Make useTheme return readonly refs** for consistency with useAuth

### P2 - Nice to Have (Technical Debt)

1. **Extract hardcoded values** to CSS variables or constants
2. **Create AuthLayout component** to reduce duplication in auth pages
3. **Add error handling utility** to reduce repetition in composables
4. **Fix DevCard timeout memory leak**
5. **Add i18n support** for language labels
6. **Improve computed for activeRoomTitle** in ChatCard

### P3 - Future Improvements

1. **Add E2E tests** with Playwright
2. **Add visual regression tests** with Percy or similar
3. **Consider Pinia** for more structured state management
4. **Add performance optimizations** (v-memo, lazy loading)
5. **Add accessibility testing** (axe-core)

---

## Appendix: File Reference

### Source Files Analyzed

```
src/
  main.ts
  App.vue
  router/index.ts
  api/
    index.ts
    auth.ts
    users.ts
    chat.ts
    friends.ts
  types/
    index.ts
    api.ts
    auth.ts
    user.ts
    chat.ts
    friend.ts
  composables/
    useAuth.ts
    useTheme.ts
    useChat.ts
    useFriends.ts
    useTwoFactor.ts
  components/
    ThemeToggle.vue
    common/ConfirmDialog.vue
    chat/{MessageBubble,ChatConversation,MessageInput,ChatRoomList}.vue
    friends/{FriendList,FriendRequests,AddFriendInput,BlockedUsers}.vue
    user/{ProfileSection,SettingsSection,SecuritySection}.vue
  pages/
    auth/{AuthPage,TwoFactorPage,VerifyEmailPage,OAuthCallbackPage}.vue
    menu/{UserCard,FriendCard,ChatCard,DevCard}.vue
  layouts/
    MenuLayout.vue
  assets/
    main.css
    themes/{index,tokens,theme-stellar,theme-dragon}.css
```

### Test Files Analyzed

```
src/
  api/__tests__/
    index.spec.ts
    auth.spec.ts
    users.spec.ts
    chat.spec.ts
    friends.spec.ts
  composables/__tests__/
    useAuth.spec.ts
    useTheme.spec.ts
    useChat.spec.ts
    useFriends.spec.ts
    useTwoFactor.spec.ts
```
