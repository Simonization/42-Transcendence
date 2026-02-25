# Frontend API Contract & Integration Guide

Reference for backend developers implementing endpoints consumed by the Vue 3 frontend.

## Quick Start

```bash
cd frontend
npm install
npm run dev        # dev server (Vite)
npx vitest run     # run tests
```

---

## API Client

All requests go through `src/api/index.ts` which wraps `fetch()` with:
- Base URL: `/api` (proxied via Nginx)
- Auto `Authorization: Bearer <token>` header
- Auto token refresh on 401 (queues concurrent requests)
- Throws `ApiError(status, code, message)` on non-2xx

---

## API Endpoints

### Auth (`src/api/auth.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | No | Login → `{ accessToken, refreshToken }` or `{ requiresTwoFactor, tempToken }` |
| POST | `/auth/register` | No | Register → `{ message, userId }` |
| POST | `/auth/logout` | Yes | Invalidate refresh token |
| POST | `/auth/refresh` | No | Body: `{ refreshToken }` → `{ accessToken }` |
| GET | `/auth/verify-email?token=` | No | Email verification |
| POST | `/auth/2fa/enable` | Yes | Send 2FA code to user's email |
| POST | `/auth/2fa/confirm` | Yes | Body: `{ code }` — confirm 2FA setup |
| POST | `/auth/2fa/verify` | No | Body: `{ tempToken, code }` → `{ accessToken, refreshToken }` |
| POST | `/auth/2fa/disable` | Yes | Disable 2FA |
| GET | `/api/auth/google` | No | Google OAuth redirect (full URL, not `/api` prefixed) |

### Users (`src/api/users.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Yes | Current user profile (must include `role`, `status`, `avatarUrl`) |
| GET | `/users?q={query}&limit=50` | Yes | Search users by username/display name |
| PATCH | `/users/{userId}/profile` | Yes | Body: `{ displayName?, bio?, avatarUrl? }` |
| PATCH | `/users/{userId}/settings` | Yes | Body: `{ language?, theme?, timezone? }` |
| DELETE | `/users/{userId}` | Yes | Delete account |

### Friends & Blocks (`src/api/friends.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/social/friends?myId={userId}` | Yes | Get all friends (pending + accepted) |
| POST | `/social/friends` | Yes | Body: `{ myId, friendId }` — send request |
| DELETE | `/social/friends` | Yes | Body: `{ myId, friendId }` — remove friend |
| GET | `/social/blocks?myId={userId}` | Yes | Get blocked users |
| POST | `/social/blocks` | Yes | Body: `{ myId, targetId, reason? }` — block user |
| DELETE | `/social/blocks` | Yes | Body: `{ myId, targetId }` — unblock |

### Chat (`src/api/chat.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/rooms?limit=50` | Yes | Get user's conversations |
| POST | `/chat/rooms` | Yes | Body: `{ userIds, title? }` — create room |
| GET | `/chat/rooms/{chatId}/messages?limit=20&offset=0` | Yes | Paginated messages |
| POST | `/chat/messages` | Yes | Body: `{ chatId, content }` — send message |
| PATCH | `/chat/messages/{messageId}` | Yes | Body: `{ content }` — edit message |
| DELETE | `/chat/messages/{messageId}` | Yes | Soft delete |
| PATCH | `/chat/rooms/{chatId}/read` | Yes | Mark as read |
| DELETE | `/chat/rooms/{chatId}/leave` | Yes | Leave group chat |

### Matches (`src/api/matches.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matches/my-history` | Yes | Current user's match history |
| GET | `/matches/history/{userId}` | Yes | Specific player's history |
| GET | `/matches/{id}` | Yes | Single match by ID |

**Game type mapping:** `1` = Chess, `2` = League of Legends, other = Unknown

**Known backend issues:**
- `GetPlayerHistoryQuery` must load ALL participants with `user` relations (not just requesting user)
- `@Get('my-history')` must be defined BEFORE `@Get(':id')` in matches.controller.ts

### Tournaments (`src/api/tournaments.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tournaments` | Yes | List all tournaments |
| GET | `/tournaments/{id}` | Yes | Single tournament (includes phases, teams, matches) |
| POST | `/tournaments` | Yes | Create tournament |
| PATCH | `/tournaments/{id}` | Yes | Update tournament |
| DELETE | `/tournaments/{id}` | Yes | Delete tournament |
| POST | `/tournaments/{id}/register` | Yes | Register for tournament |

### Teams (`src/api/teams.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/teams` | Yes | Create team (caller becomes captain) |
| PATCH | `/teams/{teamId}/invite` | Yes | Invite player (captain only) |
| PATCH | `/teams/{teamId}/kick` | Yes | Kick player (captain only) |
| PATCH | `/teams/{teamId}/lock` | Yes | Lock team (captain only, must be full) |
| GET | `/teams/invitations/my` | Yes | Current user's pending invitations |
| PATCH | `/teams/invitations/{invitationId}/accept` | Yes | Accept invitation |
| PATCH | `/teams/invitations/{invitationId}/decline` | Yes | Decline invitation |

### Games (`src/api/games.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/games` | Yes | List all available games |
| GET | `/games/{id}` | Yes | Single game |
| POST | `/games` | Yes | Create game config (admin) |

### Organizations (`src/api/organizations.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/organizations?q={query}` | Yes | List/search organizations |
| GET | `/organizations/{id}` | Yes | Single organization |
| POST | `/organizations` | Yes | Create organization |
| PATCH | `/organizations/{id}` | Yes | Update organization |
| DELETE | `/organizations/{id}` | Yes | Delete organization |
| GET | `/organizations/{orgId}/members` | Yes | Get members |
| POST | `/organizations/{orgId}/members` | Yes | Add member |
| DELETE | `/organizations/{orgId}/members/{userId}` | Yes | Remove member |

### Admin (`src/api/admin.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users?page=&limit=&q=` | Yes (admin) | List users with pagination |
| PATCH | `/users/{userId}` | Yes (admin) | Update user (username, status, avatarUrl) |

### Notifications (`src/api/notifications.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications?type=&unreadOnly=&page=&limit=` | Yes | Query notifications |
| GET | `/notifications/unread-count` | Yes | `{ count }` |
| POST | `/notifications/{id}/read` | Yes | Mark as read |
| POST | `/notifications/read-all` | Yes | Mark all as read |
| DELETE | `/notifications/{id}` | Yes | Delete notification |
| POST | `/notifications/send` | Yes (admin) | Send notification to user |

---

## WebSocket Events (`src/composables/useChat.ts`)

Connection: `Socket.io` client at `/` with `auth: { token }`.

### Incoming (server → client)

| Event | Payload | Purpose |
|-------|---------|---------|
| `message` | `Message & Record<string, unknown>` | New message received |
| `time-pulse` | `string` (serverTime) | Server heartbeat |
| `announcement` | `Record<string, unknown>` | Admin broadcast |

### Outgoing (client → server)

| Event | Payload | Purpose |
|-------|---------|---------|
| `create-announcement` | `{ message: string }` | Send admin announcement |

---

## Token Management

- Tokens stored in `localStorage`: `accessToken`, `refreshToken`
- Access token sent as `Authorization: Bearer <token>`
- On 401: auto-refresh via `POST /auth/refresh`, queue concurrent requests
- On refresh failure: clear tokens, redirect to `/auth`

---

## Routes

### Public
| Path | Name |
|------|------|
| `/` | landing |
| `/auth` | auth |
| `/auth/verify-email` | verify-email |
| `/auth/2fa` | two-factor |
| `/auth/callback` | oauth-callback |
| `/privacy` | privacy |
| `/terms` | terms |

### Protected (require auth, under `/menu`)
| Path | Name | Notes |
|------|------|-------|
| `/menu/user` | user | Profile card |
| `/menu/friend` | friend | Friends list |
| `/menu/chat` | chat | Chat rooms |
| `/menu/history` | match-history | Match history |
| `/menu/brackets` | tournament-brackets | Bracket view |
| `/menu/tournaments` | tournaments | Tournament list |
| `/menu/tournaments/:id` | tournament-detail | Single tournament |
| `/menu/organizations` | organizations | Org list |
| `/menu/dev` | dev | Dev tools card |
| `/menu/admin` | admin | **Admin role required** |

---

## Pinia Stores

| Store | Key State | Key Actions |
|-------|-----------|-------------|
| `useAuthStore` | `user`, `isAuthenticated` | `checkAuth()`, `logout()` |
| `useChatStore` | `rooms`, `messages`, `activeRoomId`, `wsConnected` | `fetchRooms()`, `selectRoom()`, `sendMessage()`, `connectSocket()` |
| `useFriendsStore` | `friends`, `blocks` | `fetchFriends()`, `addFriend()`, `blockUser()` |
| `useNotificationsStore` | `notifications` | `success()`, `error()`, `warning()`, `info()` |
| `useThemeStore` | `theme` (stellar/dragon) | `toggleTheme()`, `setTheme()` |

---

## Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public status: number,    // HTTP status code
    public code: string,      // e.g. 'UNKNOWN_ERROR', 'SESSION_EXPIRED'
    public message: string    // Human-readable message
  )
}
```

Backend should return errors as:
```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Username is required"
}
```

---

## Key TypeScript Types

See `src/types/` for full definitions. Notable enums:

| Type | Values |
|------|--------|
| `FriendStatus` | `0` = Pending, `1` = Accepted |
| `ChatType` | `0` = DM, `1` = Group |
| `TournamentStatus` | `0` = Draft, `1` = Registration Open, `2` = Ongoing, `3` = Completed |
| `UserRole` | `0` = User, `1` = Admin, `2` = Moderator, `999` = Bot |
| `Theme` | `0` = System, `1` = Light, `2` = Dark |
| `OrgRole` | `'owner'`, `'admin'`, `'member'` |
