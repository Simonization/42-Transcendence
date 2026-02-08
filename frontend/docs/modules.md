# Module Reference

## API Layer (`src/api/`)

### `api/index.ts` - HTTP Client

The base API client provides a fetch wrapper with authentication and automatic token refresh.

**Exported Functions:**

```typescript
// Main API function
function api<T>(endpoint: string, options?: RequestOptions): Promise<T>

// Token management
function getAccessToken(): string | null
function getRefreshToken(): string | null
function setTokens(accessToken: string, refreshToken?: string): void
function clearTokens(): void
```

**Features:**
- Automatically adds `Authorization: Bearer <token>` header when `auth: true` (default)
- Handles 401 responses by refreshing the access token and retrying
- Queues concurrent requests during token refresh to prevent race conditions
- Redirects to `/login` when refresh fails
- Parses JSON responses and handles empty responses (204)
- Throws `ApiError` on non-2xx responses

**Usage:**

```typescript
// GET with auth
const user = await api<User>('/users/me')

// POST without auth
const response = await api<AuthResponse>('/auth/login', {
  method: 'POST',
  body: { username: 'test', password: 'test' },
  auth: false,
})
```

---

### `api/auth.ts` - Auth API

**Exported Object:** `authApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `login` | `(data: LoginRequest) => Promise<LoginResponse>` | Login, stores tokens on success |
| `register` | `(data: RegisterRequest) => Promise<RegisterResponse>` | Register new user |
| `logout` | `() => Promise<MessageResponse>` | Logout, always clears tokens |
| `refresh` | `(refreshToken: string) => Promise<RefreshTokenResponse>` | Refresh access token |
| `verifyEmail` | `(token: string) => Promise<MessageResponse>` | Verify email with token |
| `enable2FA` | `() => Promise<MessageResponse>` | Start 2FA enablement (sends code) |
| `confirm2FA` | `(data: Confirm2FARequest) => Promise<MessageResponse>` | Confirm 2FA with code |
| `verify2FA` | `(data: Verify2FARequest) => Promise<AuthResponse>` | Verify 2FA during login |
| `disable2FA` | `() => Promise<MessageResponse>` | Disable 2FA |
| `googleLogin` | `() => void` | Redirect to Google OAuth |
| `handleOAuthCallback` | `(accessToken: string, refreshToken: string) => void` | Store OAuth tokens |

---

### `api/users.ts` - Users API

**Exported Object:** `usersApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getMe` | `() => Promise<User>` | Get current authenticated user |
| `updateProfile` | `(userId: number, data: UpdateProfileDto) => Promise<UserProfile>` | Update profile |
| `updateSettings` | `(userId: number, data: UpdateSettingsDto) => Promise<UserSettings>` | Update settings |
| `deleteAccount` | `(userId: number) => Promise<MessageResponse>` | Delete user account |

---

### `api/chat.ts` - Chat API

**Exported Object:** `chatApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRooms` | `(limit?: number) => Promise<ChatRoom[]>` | Get user's chat rooms (default limit: 50) |
| `createRoom` | `(data: CreateRoomDto) => Promise<ChatRoom>` | Create new chat room |
| `getMessages` | `(chatId: number, limit?: number, offset?: number) => Promise<Message[]>` | Get messages for room |
| `sendMessage` | `(data: SendMessageDto) => Promise<Message>` | Send a message |
| `editMessage` | `(messageId: number, data: EditMessageDto) => Promise<Message>` | Edit a message |
| `deleteMessage` | `(messageId: number) => Promise<void>` | Soft delete a message |
| `markAsRead` | `(chatId: number) => Promise<void>` | Mark chat as read |
| `leaveChat` | `(chatId: number) => Promise<void>` | Leave a group chat |

---

### `api/friends.ts` - Friends/Social API

**Exported Object:** `friendsApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getFriends` | `(userId: number) => Promise<Friend[]>` | Get all friends for user |
| `addFriend` | `(data: AddFriendDto) => Promise<Friend>` | Send friend request |
| `removeFriend` | `(data: RemoveFriendDto) => Promise<void>` | Remove friend |
| `getBlocked` | `(userId: number) => Promise<Block[]>` | Get blocked users |
| `blockUser` | `(data: BlockUserDto) => Promise<Block>` | Block a user |
| `unblockUser` | `(data: UnblockUserDto) => Promise<void>` | Unblock a user |

---

## Type System (`src/types/`)

### Core Types (`api.ts`)

```typescript
class ApiError extends Error {
  status: number      // HTTP status code
  code: string        // Error code (e.g., 'BAD_REQUEST')
  message: string     // Error message

  isAuthError(): boolean      // status === 401
  isValidationError(): boolean // status === 400
  isNotFoundError(): boolean   // status === 404
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean      // Include auth header (default: true)
  body?: unknown      // Request body (will be JSON stringified)
}

interface ApiErrorResponse {
  statusCode: number
  message: string
  error?: string
}

interface PaginationParams {
  limit?: number
  offset?: number
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}
```

### User Types (`user.ts`)

```typescript
interface User {
  id: number
  username: string
  mail: string
  twoFactorEnabled: boolean
  role?: number
  status?: number
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  createdAt?: string
  profile: UserProfile
  settings: UserSettings
}

interface UserProfile {
  userId: number
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: string
}

interface UserSettings {
  userId: number
  language: 'en' | 'fr' | 'tr' | 'nl' | 'ko'
  timezone: string | null
  theme: 0 | 1 | 2  // 0=System, 1=Light, 2=Dark
  openMessage: boolean
  createdAt: string
}

interface UpdateProfileDto {
  displayName?: string
  avatarUrl?: string
  bio?: string
}

interface UpdateSettingsDto {
  language?: 'en' | 'fr' | 'tr' | 'nl' | 'ko'
  timezone?: string
  theme?: 0 | 1 | 2
  openMessage?: boolean
}

enum Theme {
  System = 0,
  Light = 1,
  Dark = 2,
}

const SUPPORTED_LANGUAGES = ['en', 'fr', 'tr', 'nl', 'ko'] as const
type SupportedLanguage = 'en' | 'fr' | 'tr' | 'nl' | 'ko'
```

### Auth Types (`auth.ts`)

```typescript
interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  mail: string
  password: string
}

interface AuthResponse {
  user: Pick<User, 'id' | 'username' | 'mail'>
  accessToken: string
  refreshToken: string
}

interface TwoFactorRequiredResponse {
  requiresTwoFactor: true
  userId: number
  message: string
}

type LoginResponse = AuthResponse | TwoFactorRequiredResponse

function requiresTwoFactor(response: LoginResponse): response is TwoFactorRequiredResponse

interface Verify2FARequest {
  userId: number
  code: string
}

interface Confirm2FARequest {
  code: string
}

interface RefreshTokenRequest {
  refreshToken: string
}

interface RefreshTokenResponse {
  accessToken: string
}

interface MessageResponse {
  message: string
}

interface RegisterResponse {
  message: string
  user: Pick<User, 'id' | 'username' | 'mail'> & { isEmailVerified: boolean }
}

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const
```

### Chat Types (`chat.ts`)

```typescript
enum ChatType {
  DM = 0,
  Group = 1,
}

interface ChatParticipant {
  id: number
  username: string
}

interface Message {
  id: number
  chatId: number
  senderId: number
  content: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  sender?: { id: number; username: string }
}

interface ChatRoom {
  id: number
  type: ChatType
  title: string | null
  participants: ChatParticipant[]
  lastMessage: Message | null
  isUnread: boolean
}

interface CreateRoomDto {
  userIds: number[]
  title?: string
}

interface SendMessageDto {
  chatId: number
  content: string
  isGif?: boolean
}

interface EditMessageDto {
  content: string
}
```

### Friend Types (`friend.ts`)

```typescript
enum FriendStatus {
  Pending = 0,
  Accepted = 1,
}

interface Friend {
  id: number
  username: string
  profile: UserProfile
  status: FriendStatus
  since: string
}

interface Block {
  id: number
  blocker: { id: number; username: string }
  blocked: { id: number; username: string }
  reason: string | null
  createdAt: string
}

interface AddFriendDto {
  friendId: number
}

interface RemoveFriendDto {
  friendId: number
}

interface BlockUserDto {
  targetId: number
  reason?: string
}

interface UnblockUserDto {
  targetId: number
}
```

---

## Composables (`src/composables/`)

### `useAuth` - Authentication State

**Pattern:** Singleton (module-level refs)

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `isAuthenticated` | `Readonly<Ref<boolean>>` | Whether user is logged in |
| `user` | `Readonly<Ref<User \| null>>` | Current user data |
| `isLoading` | `Readonly<Ref<boolean>>` | Loading state |
| `checkAuth` | `() => Promise<boolean>` | Validate token and fetch user |
| `logout` | `() => Promise<void>` | Logout and clear state |

**Usage:**

```typescript
const { isAuthenticated, user, checkAuth, logout } = useAuth()

onMounted(async () => {
  const valid = await checkAuth()
  if (!valid) router.push('/auth')
})
```

---

### `useTheme` - Theme Management

**Pattern:** Singleton (module-level ref)

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `theme` | `Ref<ThemeMode>` | Current theme ('stellar' or 'dragon') |
| `setTheme` | `(theme: ThemeMode) => void` | Set theme and persist |
| `toggleTheme` | `() => void` | Toggle between themes |
| `isDark` | `ComputedRef<boolean>` | Whether current theme is dark |
| `themeName` | `ComputedRef<string>` | Display name ('Stellar' or 'Dragon') |

**Additional Export:**

```typescript
function initTheme(): void  // Call before app mount to prevent flash
```

**Usage:**

```typescript
const { theme, toggleTheme, themeName } = useTheme()
```

---

### `useChat` - Chat State

**Pattern:** Instance (new state per call)

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `rooms` | `Ref<ChatRoom[]>` | List of chat rooms |
| `activeRoomId` | `Ref<number \| null>` | Currently selected room |
| `activeRoom` | `ComputedRef<ChatRoom \| null>` | Currently selected room data |
| `messages` | `Ref<Message[]>` | Messages for active room |
| `isLoadingRooms` | `Ref<boolean>` | Loading rooms |
| `isLoadingMessages` | `Ref<boolean>` | Loading messages |
| `isSending` | `Ref<boolean>` | Sending message |
| `error` | `Ref<string>` | Error message |
| `unreadCount` | `ComputedRef<number>` | Count of unread rooms |
| `wsConnected` | `Ref<boolean>` | WebSocket connection state |
| `fetchRooms` | `() => Promise<void>` | Fetch user's rooms |
| `selectRoom` | `(roomId: number) => Promise<void>` | Select and load room |
| `sendMessage` | `(content: string) => Promise<void>` | Send message |
| `createRoom` | `(userIds: number[], title?: string) => Promise<ChatRoom \| null>` | Create room |
| `deleteMessage` | `(messageId: number) => Promise<void>` | Delete message |
| `connectSocket` | `() => void` | Connect WebSocket |
| `disconnectSocket` | `() => void` | Disconnect WebSocket |

---

### `useFriends` - Social State

**Pattern:** Instance (new state per call)

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `friends` | `Ref<Friend[]>` | All friends |
| `blocks` | `Ref<Block[]>` | Blocked users |
| `isLoading` | `Ref<boolean>` | Loading state |
| `error` | `Ref<string>` | Error message |
| `acceptedFriends` | `ComputedRef<Friend[]>` | Friends with status=1 |
| `pendingFriends` | `ComputedRef<Friend[]>` | Friends with status=0 |
| `fetchFriends` | `(userId: number) => Promise<void>` | Fetch friends |
| `fetchBlocks` | `(userId: number) => Promise<void>` | Fetch blocked |
| `addFriend` | `(friendId: number) => Promise<boolean>` | Add friend |
| `removeFriend` | `(friendId: number) => Promise<boolean>` | Remove friend |
| `blockUser` | `(targetId: number, reason?: string) => Promise<boolean>` | Block user |
| `unblockUser` | `(targetId: number) => Promise<boolean>` | Unblock user |

---

### `useTwoFactor` - 2FA Management

**Pattern:** Instance (new state per call)

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `enabled` | `Ref<boolean>` | Whether 2FA is enabled |
| `loading` | `Ref<boolean>` | Loading state |
| `message` | `Ref<string>` | Status/error message |
| `showForm` | `Ref<boolean>` | Show code input form |
| `code` | `Ref<string>` | Code input value |
| `isFetching` | `Ref<boolean>` | Fetching initial status |
| `fetchStatus` | `() => Promise<void>` | Fetch current 2FA status |
| `enable` | `() => Promise<void>` | Start 2FA enablement |
| `confirm` | `() => Promise<void>` | Confirm with code |
| `disable` | `() => Promise<void>` | Disable 2FA |

---

## Theme System

### How Themes Work

1. **Initialization:** `initTheme()` is called in `main.ts` before Vue mounts
2. **Storage:** Theme preference saved to `localStorage.theme`
3. **Application:** Theme applied via `data-theme` attribute on `<html>`
4. **Switching:** `useTheme().toggleTheme()` or `setTheme()`

### CSS Custom Properties

All colors and visual properties are defined as CSS variables. Components never use hardcoded colors.

**Example usage in component:**
```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
}
```

**Theme Variables Categories:**
- Background: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-elevated`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`
- Accent: `--accent-primary`, `--accent-primary-hover`, `--accent-primary-subtle`
- Status: `--color-success`, `--color-warning`, `--color-error`, `--color-info`
- Border: `--border-default`, `--border-subtle`, `--border-strong`
- Components: `--btn-*`, `--card-*`, `--input-*`, `--nav-item-*`

---

## CSS Architecture

### File Structure

```
src/assets/
  main.css              # Entry point (imports themes)
  themes/
    index.css           # Aggregates theme files + utility classes
    tokens.css          # Design tokens (spacing, typography, etc.)
    theme-stellar.css   # Light theme (white bg, orange accent)
    theme-dragon.css    # Dark theme (navy bg, gold accent)
```

### Design Tokens (`tokens.css`)

- **Spacing:** `--space-0` through `--space-24` (4px base unit)
- **Typography:** Font families, sizes (`--text-xs` to `--text-6xl`), weights, line heights
- **Border radius:** `--radius-none` to `--radius-full`
- **Transitions:** `--duration-fast/normal/slow`, `--ease-*` curves
- **Z-index:** `--z-dropdown` through `--z-toast`
- **Layout:** `--sidebar-width`, `--header-height`, `--container-max`

### Utility Classes (`index.css`)

**Buttons:**
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- `.btn-sm`, `.btn-lg`

**Cards:**
- `.card`, `.card-body`, `.card-header`, `.card-footer`

**Form Elements:**
- `.input`, `.input-error`
- `.label`, `.label-caps`

**Badges:**
- `.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-error`

**Alerts:**
- `.alert`, `.alert-success`, `.alert-error`, `.alert-warning`, `.alert-info`

**Text:**
- `.text-primary`, `.text-secondary`, `.text-tertiary`
- `.text-accent`, `.text-success`, `.text-warning`, `.text-error`

**Navigation:**
- `.nav-item`, `.nav-item.active`
