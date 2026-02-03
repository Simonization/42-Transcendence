# Implementation Plan: API Service Layer + User Layer

## Overview

This plan implements **Phase 1 (API Foundation)** and **Phase 2 (User Features)** from `frontend_dev.md`, using specialized agents with assigned skills.

---

## Agent Definitions

| Agent | Role | Assigned Skills |
|-------|------|-----------------|
| **Architect** | Plans structure, reviews architecture decisions | `software-engineering`, `code-review` |
| **TypeScript Engineer** | Creates types, interfaces, API layer | `vue-best-practices`, `vue` |
| **Vue Senior Dev** | Builds Vue components, pages, composables | `vue-best-practices`, `vue`, `vue-router`, `interface-design` |
| **UI Designer** | Designs UI components with distinctive aesthetics | `frontend-design`, `interface-design`, `web-design` |
| **Tester** | Writes unit tests, integration tests | `vue-testing`, `frontend-testing` |
| **Code Reviewer** | Reviews PRs, ensures quality | `code-review`, `vue-best-practices` |

---

## Phase 1: API Service Layer Foundation

### Step 1.1: Create TypeScript Types
**Agent:** TypeScript Engineer
**Skills:** `vue-best-practices`
**Files to create:**
```
frontend/src/types/
├── index.ts          # Re-exports all types
├── api.ts            # API request/response types
├── user.ts           # User, UserProfile, UserSettings
└── auth.ts           # Auth responses, tokens
```

**Tasks:**
1. Create `frontend/src/types/` directory
2. Define `User`, `UserProfile`, `UserSettings` interfaces matching backend entities
3. Define `AuthResponse`, `TwoFactorResponse`, `LoginRequest`, `RegisterRequest`
4. Define generic `ApiError` type for error handling
5. Export all types from `index.ts`

**Acceptance Criteria:**
- All types match backend DTOs from `backend_architecture.md`
- Strict TypeScript (no `any` types)
- JSDoc comments on complex types

---

### Step 1.2: Create Base API Client
**Agent:** TypeScript Engineer
**Skills:** `vue-best-practices`, `software-engineering`
**File:** `frontend/src/api/index.ts`

**Tasks:**
1. Create generic `api<T>()` fetch wrapper function
2. Implement automatic Authorization header injection
3. Add error handling with typed `ApiError`
4. Add token refresh interceptor logic (detect 401, try refresh, retry)
5. Configure base URL from environment

**Code Structure:**
```typescript
// frontend/src/api/index.ts
const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function api<T>(endpoint: string, options?: RequestOptions): Promise<T>
export async function refreshAccessToken(): Promise<boolean>
```

**Acceptance Criteria:**
- Generic typing for all responses
- Automatic token injection
- 401 handling with refresh attempt
- Network error handling

---

### Step 1.3: Create Auth API Module
**Agent:** TypeScript Engineer
**Skills:** `vue-best-practices`
**File:** `frontend/src/api/auth.ts`

**Tasks:**
1. Implement `authApi` object with all auth endpoints:
   - `login(data: LoginRequest)`
   - `register(data: RegisterRequest)`
   - `logout()`
   - `refresh(refreshToken: string)`
   - `verifyEmail(token: string)`
   - `enable2FA()`, `confirm2FA(code)`, `verify2FA(userId, code)`, `disable2FA()`
   - `googleLogin()` (redirect)

**Acceptance Criteria:**
- All endpoints from `backend_architecture.md` Section 2
- Proper TypeScript return types
- `auth: false` for public endpoints

---

### Step 1.4: Create Users API Module
**Agent:** TypeScript Engineer
**Skills:** `vue-best-practices`
**File:** `frontend/src/api/users.ts`

**Tasks:**
1. Implement `usersApi` object:
   - `getMe()` → `User`
   - `updateProfile(userId, data)` → `UserProfile`
   - `updateSettings(userId, data)` → `UserSettings`
   - `deleteAccount(userId)`

**Acceptance Criteria:**
- All endpoints from `backend_architecture.md` Section 3
- Proper TypeScript types

---

### Step 1.5: Refactor Existing Components to Use API Layer
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `vue`, `code-review`
**Files to modify:**
- `frontend/src/composables/useAuth.ts`
- `frontend/src/composables/useTwoFactor.ts`
- `frontend/src/components/LoginPage.vue`
- `frontend/src/pages/Dashboard.vue`
- `frontend/src/pages/VerifyEmail.vue`
- `frontend/src/pages/TwoFactorVerify.vue`

**Tasks:**
1. Replace all direct `fetch()` calls with `authApi.*` and `usersApi.*`
2. Update error handling to use `ApiError`
3. Ensure TypeScript types are used throughout
4. Remove duplicate token handling logic

**Acceptance Criteria:**
- No direct `fetch()` calls remain in components
- All API calls go through `/src/api/` layer
- Consistent error handling

---

### Step 1.6: Write Tests for API Layer
**Agent:** Tester
**Skills:** `vue-testing`, `frontend-testing`
**Files to create:**
```
frontend/src/api/__tests__/
├── index.spec.ts     # Base API client tests
├── auth.spec.ts      # Auth API tests
└── users.spec.ts     # Users API tests
```

**Tasks:**
1. Mock fetch for unit tests
2. Test successful responses
3. Test error handling (401, 403, 500)
4. Test token refresh flow
5. Test each API method

**Acceptance Criteria:**
- 80%+ coverage on API layer
- All error paths tested

---

## Phase 2: User Layer (Profile & Settings)

### Step 2.1: Design UI Components
**Agent:** UI Designer
**Skills:** `frontend-design`, `interface-design`
**Deliverable:** Design specifications for:
- Profile page layout
- Settings page layout
- Form components (input, select, toggle)
- Avatar component with upload

**Design Requirements:**
- Follow existing dark theme (`#1a1a1a`, `#2c2c2c`)
- Primary gradient: `#667eea` → `#764ba2`
- Distinctive, non-generic aesthetics
- Responsive design

---

### Step 2.2: Create Common UI Components
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `vue`, `interface-design`
**Files to create:**
```
frontend/src/components/common/
├── BaseInput.vue       # Styled text input
├── BaseSelect.vue      # Styled select dropdown
├── BaseToggle.vue      # Theme/boolean toggle
├── BaseButton.vue      # Primary/secondary buttons
├── BaseCard.vue        # Card container
├── Toast.vue           # Notification toast
└── LoadingSpinner.vue  # Loading indicator
```

**Tasks:**
1. Create reusable form components with props for customization
2. Implement Toast component with auto-dismiss
3. Add loading states
4. Use CSS variables for theming

**Acceptance Criteria:**
- Components use `<script setup lang="ts">`
- Props fully typed with `defineProps<T>()`
- Emits defined with `defineEmits<T>()`
- Scoped styles matching design system

---

### Step 2.3: Create User Store (Pinia)
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `vue`
**Files to create:**
```
frontend/src/stores/
├── index.ts          # Pinia setup
└── user.ts           # User state store
```

**Tasks:**
1. Install Pinia: `npm install pinia`
2. Create user store with:
   - `user` state (current user)
   - `isAuthenticated` getter
   - `fetchUser()` action
   - `updateProfile()` action
   - `updateSettings()` action
   - `logout()` action
3. Register Pinia in `main.js`

**Code Structure:**
```typescript
// frontend/src/stores/user.ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function fetchUser() { ... }
  async function updateProfile(data: UpdateProfileDto) { ... }
  async function updateSettings(data: UpdateSettingsDto) { ... }
  async function logout() { ... }

  return { user, isAuthenticated, fetchUser, updateProfile, updateSettings, logout };
});
```

**Acceptance Criteria:**
- Composition API style store
- Fully typed
- Integrates with API layer

---

### Step 2.4: Create Profile Page
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `vue`, `vue-router`, `interface-design`
**File:** `frontend/src/pages/Profile.vue`

**Tasks:**
1. Create profile edit form with fields:
   - Display name (text input)
   - Bio (textarea)
   - Avatar (image + upload button placeholder)
2. Load current profile from user store
3. Submit updates via `usersApi.updateProfile()`
4. Show success/error toast

**Acceptance Criteria:**
- Form validation (displayName: 3-20 chars)
- Loading states during save
- Optimistic UI updates
- Route: `/profile`

---

### Step 2.5: Create Settings Page
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `vue`, `vue-router`, `interface-design`
**File:** `frontend/src/pages/Settings.vue`

**Tasks:**
1. Create settings form with:
   - Language selector (en, fr, tr, nl, ko)
   - Theme toggle (System/Light/Dark)
   - Timezone selector (optional)
2. Load current settings from user store
3. Submit updates via `usersApi.updateSettings()`
4. Apply theme change immediately

**Acceptance Criteria:**
- Settings persist via API
- Theme applies to entire app
- Route: `/settings`

---

### Step 2.6: Update Router
**Agent:** Vue Senior Dev
**Skills:** `vue-router`
**File:** `frontend/src/router/index.js`

**Tasks:**
1. Add routes:
   ```javascript
   { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } }
   { path: '/settings', name: 'settings', component: Settings, meta: { requiresAuth: true } }
   ```
2. Add navigation links to Dashboard

**Acceptance Criteria:**
- Routes protected by auth guard
- Lazy loading with `() => import()`

---

### Step 2.7: Update Dashboard Navigation
**Agent:** Vue Senior Dev
**Skills:** `vue-best-practices`, `interface-design`
**File:** `frontend/src/pages/Dashboard.vue`

**Tasks:**
1. Add navigation sidebar or header with links:
   - Dashboard (home)
   - Profile
   - Settings
   - Logout
2. Highlight current route
3. Use user store for user data instead of local fetch

**Acceptance Criteria:**
- Clear navigation UX
- Active route indication
- Responsive layout

---

### Step 2.8: Write Component Tests
**Agent:** Tester
**Skills:** `vue-testing`, `frontend-testing`
**Files to create:**
```
frontend/src/pages/__tests__/
├── Profile.spec.ts
└── Settings.spec.ts

frontend/src/stores/__tests__/
└── user.spec.ts
```

**Tasks:**
1. Test Profile page form submission
2. Test Settings page theme change
3. Test user store actions
4. Mock API calls

**Acceptance Criteria:**
- Form validation tested
- API integration tested with mocks
- Store state changes verified

---

### Step 2.9: Code Review
**Agent:** Code Reviewer
**Skills:** `code-review`, `vue-best-practices`

**Review Checklist:**
- [ ] No `any` types
- [ ] Composition API with `<script setup>`
- [ ] Props/emits properly typed
- [ ] Error handling in all API calls
- [ ] Loading states for async operations
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] No console.log statements
- [ ] Consistent naming conventions

---

## Execution Order

```
Phase 1: API Layer
├── 1.1 TypeScript Types ─────────────────┐
├── 1.2 Base API Client ──────────────────┤
├── 1.3 Auth API Module ──────────────────┼── Can run in parallel
├── 1.4 Users API Module ─────────────────┘
├── 1.5 Refactor Components ──────────────── Depends on 1.1-1.4
└── 1.6 API Tests ────────────────────────── Depends on 1.1-1.4

Phase 2: User Layer
├── 2.1 UI Design ────────────────────────┐
├── 2.2 Common Components ────────────────┼── Can run in parallel
├── 2.3 User Store ───────────────────────┘
├── 2.4 Profile Page ─────────────────────── Depends on 2.2, 2.3
├── 2.5 Settings Page ────────────────────── Depends on 2.2, 2.3
├── 2.6 Router Update ────────────────────── Depends on 2.4, 2.5
├── 2.7 Dashboard Navigation ─────────────── Depends on 2.3, 2.6
├── 2.8 Component Tests ──────────────────── Depends on 2.4, 2.5
└── 2.9 Code Review ──────────────────────── Final step
```

---

## Files Summary

### New Files to Create (17 files)
```
frontend/src/
├── types/
│   ├── index.ts
│   ├── api.ts
│   ├── user.ts
│   └── auth.ts
├── api/
│   ├── index.ts
│   ├── auth.ts
│   ├── users.ts
│   └── __tests__/
│       ├── index.spec.ts
│       ├── auth.spec.ts
│       └── users.spec.ts
├── stores/
│   ├── index.ts
│   ├── user.ts
│   └── __tests__/
│       └── user.spec.ts
├── components/common/
│   ├── BaseInput.vue
│   ├── BaseSelect.vue
│   ├── BaseToggle.vue
│   ├── BaseButton.vue
│   ├── BaseCard.vue
│   ├── Toast.vue
│   └── LoadingSpinner.vue
└── pages/
    ├── Profile.vue
    ├── Settings.vue
    └── __tests__/
        ├── Profile.spec.ts
        └── Settings.spec.ts
```

### Files to Modify (7 files)
```
frontend/src/
├── main.js                    # Add Pinia
├── router/index.js            # Add routes
├── composables/useAuth.ts     # Use API layer
├── composables/useTwoFactor.ts # Use API layer
├── components/LoginPage.vue   # Use API layer
├── pages/Dashboard.vue        # Add navigation, use store
└── pages/VerifyEmail.vue      # Use API layer
```

---

## Dependencies to Install

```bash
cd frontend
npm install pinia
npm install -D vitest @vue/test-utils happy-dom
```

---

## Estimated Effort

| Phase | Steps | Parallel Agents | Sequential Work |
|-------|-------|-----------------|-----------------|
| Phase 1 | 1.1-1.6 | 4 agents | ~2-3 hours |
| Phase 2 | 2.1-2.9 | 3 agents | ~4-5 hours |
| **Total** | **15 steps** | **Multiple** | **~6-8 hours** |

---

## Next Steps After Completion

Once Phase 1 & 2 are complete, proceed to:
- **Phase 3:** Friends Module (requires backend import)
- **Phase 4:** Chat Module (requires backend import)
- **Phase 5:** Polish (toast system, error boundaries)
