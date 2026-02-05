# Type System Guide: Backend ↔ Frontend Contract

## Overview

The type system in this project serves as a **contract** between the backend (NestJS) and frontend (Vue 3). It ensures both sides speak the same language, preventing runtime errors and enabling IDE autocompletion.

Types are organized in `/frontend/src/types/` and mirror backend entities:
- `auth.ts` — Authentication flows (login, register, 2FA)
- `user.ts` — User profiles and settings
- `api.ts` — Base API error and request types

---

## How Types Connect Backend & Frontend

### 1. Data Structure Contract

**Backend (NestJS) sends:**
```json
{
  "user": { "id": 1, "username": "john", "mail": "john@test.com" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "xyz123..."
}
```

**Frontend type definition** (`src/types/auth.ts`):
```typescript
export interface AuthResponse {
  user: Pick<User, 'id' | 'username' | 'mail'>;
  accessToken: string;
  refreshToken: string;
}
```

**Result:** Frontend knows exactly what structure to expect and receives IDE autocompletion.

---

## Real-World Examples

### Example 1: Login Flow

**Backend Endpoint:**
```
POST /api/auth/login
Request: { username: string, password: string }
Response: AuthResponse | TwoFactorRequiredResponse
```

**Frontend Type Definition:**
```typescript
// types/auth.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'username' | 'mail'>;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: number;
  message: string;
}

export type LoginResponse = AuthResponse | TwoFactorRequiredResponse;

export function requiresTwoFactor(
  response: LoginResponse
): response is TwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor === true;
}
```

**Frontend API Layer** (`src/api/auth.ts`):
```typescript
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: data,
      auth: false,
    });

    // Store tokens if login successful (no 2FA required)
    if ('accessToken' in response) {
      setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },
};
```

**Frontend Usage:**
```typescript
// In a Vue component or composable
const result = await authApi.login({ username: 'john', password: 'secret' });

if (authApi.requiresTwoFactor(result)) {
  // TypeScript knows result.userId and result.requiresTwoFactor exist
  navigateTo(`/auth/2fa?userId=${result.userId}`);
} else {
  // TypeScript knows result.accessToken and result.user exist
  console.log(`Welcome, ${result.user.username}`);
}
```

**Benefits:**
- TypeScript compiler validates the response shape
- IDE autocomplete for all response properties
- Type guard (`requiresTwoFactor`) ensures safe type narrowing
- No runtime guessing about response structure

---

### Example 2: User Profile Update

**Backend Endpoint:**
```
PATCH /api/users/{id}/profile
Request Body: UpdateProfileDto (partial)
Response: UserProfile
```

**Frontend Types:**
```typescript
// types/user.ts
export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UserProfile {
  userId: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}
```

**Frontend API Layer** (`src/api/users.ts`):
```typescript
export const usersApi = {
  updateProfile: (userId: number, data: UpdateProfileDto): Promise<UserProfile> => {
    return api<UserProfile>(`/users/${userId}/profile`, {
      method: 'PATCH',
      body: data,
    });
  },
};
```

**Frontend Usage:**
```typescript
// TypeScript ensures only valid fields are sent
const updated = await usersApi.updateProfile(userId, {
  displayName: 'Alice',
  bio: 'Tournament organizer'
  // ❌ TypeScript error: avatarUrlz is not a valid property
});

// TypeScript ensures response has all expected properties
console.log(updated.displayName);  // ✓ Valid
console.log(updated.createdAt);    // ✓ Valid
console.log(updated.unknownField); // ❌ TypeScript error
```

---

### Example 3: Error Handling

**Common Error Shape** (`src/types/api.ts`):
```typescript
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isAuthError(): boolean {
    return this.status === 401;
  }

  isValidationError(): boolean {
    return this.status === 400;
  }

  isNotFoundError(): boolean {
    return this.status === 404;
  }
}
```

**Backend Returns:**
```json
{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "Invalid credentials"
}
```

**Frontend Handles Consistently:**
```typescript
try {
  await authApi.login({ username, password });
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isAuthError()) {
      showError('Invalid username or password');
    } else if (error.isValidationError()) {
      showError('Please check your input');
    } else if (error.isNotFoundError()) {
      showError('User not found');
    }
  }
}
```

**Benefits:**
- Consistent error handling across the app
- Helper methods for common error checks
- Type safety when catching errors
- Centralized error interpretation logic

---

## Why Types Matter

### Problem → Solution

| Problem | Solution |
|---------|----------|
| Backend changes response field name | TypeScript catches it at compile time |
| Frontend sends wrong field names | Type checking prevents submission |
| Missing required fields in request | Types enforce completeness |
| Runtime `undefined` errors | TypeScript prevents property access on unknown fields |
| API contract unclear to developers | Types serve as auto-documentation |
| Frontend and backend out of sync | Types must match or compilation fails |
| Refactoring causes silent failures | Renaming a type property updates everywhere |
| Guessing API response structure | IDE autocomplete shows exact structure |

---

## Type System Architecture

### File Structure

```
frontend/src/types/
├── index.ts          # Central re-export of all types
├── api.ts            # Base API types (ApiError, RequestOptions, etc.)
├── auth.ts           # Authentication types
├── user.ts           # User, UserProfile, UserSettings types
```

### How They Connect

```
┌─────────────────────────────────────┐
│  Backend (NestJS)                   │
│  - User entity                      │
│  - Auth endpoints (POST /auth/...)  │
│  - Response: JSON                   │
└──────────────┬──────────────────────┘
               │
               │ HTTP JSON
               ↓
┌─────────────────────────────────────┐
│  Frontend API Layer (src/api/)      │
│  - authApi.login()                  │
│  - usersApi.getMe()                 │
│  - Calls fetch() with typed response│
└──────────────┬──────────────────────┘
               │
               │ Returns typed Promise<T>
               ↓
┌─────────────────────────────────────┐
│  Type System (src/types/)           │
│  - AuthResponse                     │
│  - User                             │
│  - UpdateProfileDto                 │
│  - Validates JSON against types     │
└──────────────┬──────────────────────┘
               │
               │ Typed data
               ↓
┌─────────────────────────────────────┐
│  Vue Components/Composables         │
│  - Full IDE autocomplete            │
│  - Type safety guaranteed           │
│  - No runtime errors                │
└─────────────────────────────────────┘
```

---

## When Types Help Most

### 1. Development
- **IDE Autocompletion** — Type hints help you discover available properties
- **Compile-Time Errors** — Catch mistakes before running code
- **Documentation** — Types document what data structures look like

### 2. Code Review
- **Contract Clarity** — Reviewers see exactly what API contract is being used
- **Breaking Changes** — Obvious when endpoint response structure changes
- **Consistency** — Types enforce consistent error handling

### 3. Refactoring
- **Safe Renames** — Change a type property = all usages updated everywhere
- **Finding Usage** — "Find all references" to a type shows all usage sites
- **Impact Analysis** — See exactly what breaks when types change

### 4. Team Collaboration
- **No Ambiguity** — Backend and frontend must agree on types or code won't compile
- **Self-Documenting** — Types replace manual API documentation
- **Less Communication** — Types enforce alignment without constant meetings

---

## Best Practices

### 1. Keep Types in Sync

When the backend API changes, update types first:

```typescript
// Before: Old response structure
export interface User {
  id: number;
  username: string;
}

// After: Backend added firstName/lastName
export interface User {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
}
```

### 2. Use Type Guards for Unions

For discriminated unions (like `LoginResponse`), use type guards:

```typescript
// ✓ Good — Type guard for safety
if (requiresTwoFactor(response)) {
  // Inside this block, response is TwoFactorRequiredResponse
  handleTwoFactor(response.userId);
}

// ❌ Bad — Just checking properties
if (response.requiresTwoFactor) {
  // response might still be AuthResponse, TypeScript doesn't know
}
```

### 3. Use Partial for Update DTOs

For partial updates, use `UpdateProfileDto` (partial fields):

```typescript
// ✓ Good — Only the fields you want to update
interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

// ❌ Bad — Full User type when only updating one field
interface UpdateProfileDto extends User {}
```

### 4. Re-export Types from `index.ts`

Centralized imports make refactoring easier:

```typescript
// ✓ Good — Single import path
import { User, AuthResponse, ApiError } from '@/types';

// ❌ Bad — Scattered imports
import { User } from '@/types/user';
import { AuthResponse } from '@/types/auth';
import { ApiError } from '@/types/api';
```

---

## Testing with Types

Types help with testing too. Mock responses must match the type definition:

```typescript
describe('Auth API', () => {
  it('should login successfully', async () => {
    const mockResponse: AuthResponse = {
      user: { id: 1, username: 'test', mail: 'test@test.com' },
      accessToken: 'token123',
      refreshToken: 'refresh456',
    };

    mockApi.mockResolvedValueOnce(mockResponse);
    const result = await authApi.login({ username: 'test', password: 'pass' });

    expect(result.user.username).toBe('test');
    expect(result.accessToken).toBe('token123');
  });
});
```

TypeScript ensures the mock matches the real response structure—if the backend changes, the mock must be updated, and tests will fail if you don't.

---

## Summary

The type system is the **communication protocol** between backend and frontend:

1. **Backend sends JSON** following a documented structure
2. **Frontend types validate** that structure matches expectations
3. **TypeScript compiler** ensures both sides stay in sync
4. **Components receive typed data** with full IDE support
5. **Refactoring is safe** because types track changes everywhere

When types and code diverge, TypeScript catches it immediately—no silent failures at runtime.
