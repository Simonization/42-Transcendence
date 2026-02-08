# Backend Architecture & API Documentation

Based on a thorough exploration of the backend codebase, here is a comprehensive summary:

---

## 1. MODULE STRUCTURE

The backend is organized into 5 main modules:

### Module Dependencies
```
AppModule
├── UsersModule
│   ├── User entity (core user data)
│   ├── UserProfile entity (display name, bio, avatar)
│   ├── UserSettings entity (language, timezone, theme)
│   ├── RefreshToken entity (session management)
│   └── Commands: CreateUser, UpdateProfile, UpdateSettings, DeleteUser
│
├── AuthModule (depends on UsersModule & MailModule)
│   ├── JwtStrategy (validates Bearer tokens)
│   ├── GoogleStrategy (OAuth 2.0)
│   ├── JwtAuthGuard (required authentication)
│   ├── OptionalJwtAuthGuard (optional authentication)
│   └── Auth service with login/register/2FA flow
│
├── MailModule
│   └── MailService (email verification, 2FA codes)
│
├── FriendsModule (NOT YET IMPORTED in app.module.ts)
│   ├── Friend entity (friend requests)
│   ├── Block entity (user blocking)
│   └── Commands/Queries for friend management
│
└── ChatModule (NOT YET IMPORTED in app.module.ts)
    ├── Chat entity (conversation rooms)
    ├── Message entity (chat messages)
    ├── ChatParticipant entity (room membership)
    ├── ChatGateway (WebSocket handler)
    └── Commands/Queries for messaging
```

**Note:** FriendsModule and ChatModule are defined but not currently imported in app.module.ts. This means their endpoints are not accessible yet.

---

## 2. AUTHENTICATION FLOW

### 2.1 Registration Flow

**Endpoint:** `POST /api/auth/register`
- **Guard:** OptionalJwtAuthGuard (rejects if already logged in)
- **Request Body (RegisterDto):**
  ```json
  {
    "username": "string (required)",
    "mail": "string (valid email, required)",
    "password": "string (min 8 chars, required)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": number,
      "username": string,
      "mail": string,
      "isEmailVerified": false
    }
  }
  ```
- **Process:**
  1. Password hashed with bcrypt (10 salt rounds)
  2. Verification token generated (32-byte crypto random hex)
  3. User created with profile (displayName = username) and default settings
  4. Verification email sent with token link
  5. User cannot login until email verified

### 2.2 Email Verification

**Endpoint:** `GET /api/auth/verify-email?token={token}`
- **No Guard Required**
- **Query Params:**
  - `token`: Verification token from email
- **Response:**
  ```json
  {
    "message": "Email verified successfully! You can now log in."
  }
  ```
- **Process:**
  1. Lookup user by verificationToken
  2. Set isEmailVerified = true
  3. Clear verificationToken
  4. User can now login

### 2.3 Login Flow

**Endpoint:** `POST /api/auth/login`
- **Guard:** OptionalJwtAuthGuard (rejects if already logged in)
- **Request Body (LoginDto):**
  ```json
  {
    "username": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response (without 2FA):**
  ```json
  {
    "user": {
      "id": number,
      "username": string,
      "mail": string
    },
    "accessToken": "jwt-token",
    "refreshToken": "jwt-token-7d-expiry"
  }
  ```
- **Response (with 2FA enabled):**
  ```json
  {
    "requiresTwoFactor": true,
    "userId": number,
    "message": "Verification code sent to your email. Please enter it to continue."
  }
  ```
- **Process:**
  1. Find user by username
  2. Verify password with bcrypt
  3. Check email is verified (throws UnauthorizedException if not)
  4. If 2FA disabled: Generate tokens and return
  5. If 2FA enabled:
     - Generate 6-digit code
     - Send code via email
     - Return userId for 2FA verification step

### 2.4 Token Refresh

**Endpoint:** `POST /api/auth/refresh`
- **No Guard Required**
- **Request Body (RefreshDto):**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "new-jwt-token"
  }
  ```
- **Process:**
  1. Verify refresh token signature
  2. Check token exists in database and not expired
  3. Generate new access token
  4. Refresh token remains valid

### 2.5 Logout

**Endpoint:** `POST /api/auth/logout`
- **Guard:** JwtAuthGuard (required)
- **Request:** No body required
- **Response:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Process:**
  1. Delete all refresh tokens for user
  2. Access token becomes useless on next use

### 2.6 Two-Factor Authentication (2FA)

#### Enable 2FA (Step 1)
**Endpoint:** `POST /api/auth/2fa/enable`
- **Guard:** JwtAuthGuard (required)
- **Request:** No body required
- **Response:**
  ```json
  {
    "message": "A verification code has been sent to your email address"
  }
  ```
- **Process:**
  1. Generate 6-digit code
  2. Save to user.twoFactorCode
  3. Send via email

#### Confirm 2FA (Step 2)
**Endpoint:** `POST /api/auth/2fa/confirm`
- **Guard:** JwtAuthGuard (required)
- **Request Body (Confirm2FaDto):**
  ```json
  {
    "code": "string (6 digits, required)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Two-factor authentication has been enabled successfully"
  }
  ```
- **Process:**
  1. Verify code matches user.twoFactorCode
  2. Set twoFactorEnabled = true
  3. Clear twoFactorCode

#### Verify 2FA During Login
**Endpoint:** `POST /api/auth/2fa/verify`
- **No Guard Required**
- **Request Body (Verify2FaDto):**
  ```json
  {
    "userId": number (required),
    "code": "string (6 digits, required)"
  }
  ```
- **Response:**
  ```json
  {
    "user": {
      "id": number,
      "username": string
    },
    "accessToken": "jwt-token",
    "refreshToken": "jwt-token-7d-expiry"
  }
  ```
- **Process:**
  1. Verify code matches user.twoFactorCode
  2. Generate and return tokens
  3. Clear twoFactorCode

#### Disable 2FA
**Endpoint:** `POST /api/auth/2fa/disable`
- **Guard:** JwtAuthGuard (required)
- **Request:** No body required
- **Response:**
  ```json
  {
    "message": "Two-factor authentication has been disabled"
  }
  ```
- **Process:**
  1. Set twoFactorEnabled = false
  2. Clear twoFactorCode

### 2.7 Google OAuth 2.0

#### Initiate Google Auth
**Endpoint:** `GET /api/auth/google`
- **Guard:** AuthGuard('google')
- **Redirects to Google login**

#### Google Callback
**Endpoint:** `GET /api/auth/google/callback`
- **Guard:** AuthGuard('google')
- **Process:**
  1. If new user: Create account with Google data (firstName, lastName, avatarUrl)
  2. If existing user: Update profile if needed
  3. If 2FA enabled: Redirect to 2FA verification
  4. If 2FA disabled: Return tokens
- **Success Redirect:** `http://localhost/login-success?accessToken=...&refreshToken=...`
- **2FA Required Redirect:** `http://localhost/verify-2fa?userId=...&googleLogin=true`

---

## 3. USERS MODULE ENDPOINTS

**Base Route:** `/api/users`
**All endpoints require JwtAuthGuard unless stated otherwise**

### Get Current User
**Endpoint:** `GET /api/users/me`
- **Guard:** JwtAuthGuard (required)
- **Response:**
  ```json
  {
    "id": number,
    "username": string,
    "mail": string,
    "twoFactorEnabled": boolean,
    "profile": {
      "userId": number,
      "displayName": string,
      "avatarUrl": string,
      "bio": string,
      "createdAt": "ISO-8601"
    },
    "settings": {
      "userId": number,
      "language": "en|fr|tr|nl|ko",
      "timezone": string,
      "theme": 0|1|2,
      "openMessage": boolean,
      "createdAt": "ISO-8601"
    }
  }
  ```

### Create User
**Endpoint:** `POST /api/users`
- **No Guard**
- **Request Body (CreateUserDto):**
  ```json
  {
    "username": "string (required)",
    "mail": "string (valid email, required)",
    "password": "string (min 8 chars, required)"
  }
  ```
- **Response:** Created user object (same as GET /me)

### Update User Settings
**Endpoint:** `PATCH /api/users/:id/settings`
- **No Guard** (should be protected in production)
- **Path Params:** `id` (user ID)
- **Request Body (UpdateSettingsDto):**
  ```json
  {
    "language": "en|fr|tr|nl|ko (optional)",
    "timezone": "string (optional)",
    "theme": 0|1|2 (optional, 0=System, 1=Light, 2=Dark)
  }
  ```
- **Response:** Updated settings object

### Update User Profile
**Endpoint:** `PATCH /api/users/:id/profile`
- **No Guard** (should be protected in production)
- **Path Params:** `id` (user ID)
- **Request Body (UpdateProfileDto):**
  ```json
  {
    "displayName": "string (3-20 chars, optional)",
    "avatarUrl": "string (optional)",
    "bio": "string (optional)"
  }
  ```
- **Response:** Updated profile object

### Delete User
**Endpoint:** `DELETE /api/users/:id`
- **No Guard** (should be protected in production)
- **Path Params:** `id` (user ID)
- **Response:**
  ```json
  {
    "message": "User deleted successfully"
  }
  ```

---

## 4. FRIENDS MODULE ENDPOINTS

**Base Route:** `/api/social`
**All endpoints require JwtAuthGuard**

**Note:** FriendsModule is NOT currently imported in app.module.ts, so these endpoints are NOT ACCESSIBLE yet.

### Add Friend (Send Request)
**Endpoint:** `POST /api/social/friends`
- **Guard:** JwtAuthGuard (required)
- **Request Body (ActionFriendDto):**
  ```json
  {
    "friendId": number (required, positive)
  }
  ```
- **Response:**
  ```json
  {
    "user1": number,
    "user2": number,
    "status": 0,
    "createdAt": "ISO-8601"
  }
  ```
- **Process:**
  1. Prevents self-friending
  2. Normalizes user IDs (lower ID first)
  3. Creates friendship with status=0 (pending)
  4. Throws error if friendship already exists

### Remove Friend
**Endpoint:** `DELETE /api/social/friends`
- **Guard:** JwtAuthGuard (required)
- **Request Body (ActionFriendDto):**
  ```json
  {
    "friendId": number (required)
  }
  ```
- **Response:** Removed friendship record

### Get Friends List
**Endpoint:** `GET /api/social/friends?myId={userId}`
- **Guard:** JwtAuthGuard (required)
- **Query Params:** `myId` (user ID)
- **Response:** Array of friend records

### Block User
**Endpoint:** `POST /api/social/blocks`
- **Guard:** JwtAuthGuard (required)
- **Request Body (BlockUserDto):**
  ```json
  {
    "targetId": number (required, positive),
    "reason": "string (optional, max 100 chars)"
  }
  ```
- **Response:**
  ```json
  {
    "id": number,
    "blocker": { user object },
    "blocked": { user object },
    "reason": string,
    "createdAt": "ISO-8601"
  }
  ```

### Unblock User
**Endpoint:** `DELETE /api/social/blocks`
- **Guard:** JwtAuthGuard (required)
- **Request Body (UnblockUserDto):**
  ```json
  {
    "targetId": number (required, positive)
  }
  ```
- **Response:** Deleted block record

### Get Blocked Users
**Endpoint:** `GET /api/social/blocks?myId={userId}`
- **Guard:** JwtAuthGuard (required)
- **Query Params:** `myId` (user ID)
- **Response:** Array of block records

---

## 5. CHAT MODULE ENDPOINTS

**Base Route:** `/api/chat`
**All endpoints require JwtAuthGuard (except WebSocket connections are not guarded)**

**Note:** ChatModule is NOT currently imported in app.module.ts, so REST endpoints are NOT ACCESSIBLE yet. WebSocket gateway may be accessible through app.module.ts providers.

### Create Chat Room
**Endpoint:** `POST /api/chat/rooms`
- **Guard:** JwtAuthGuard (required)
- **Request Body (CreateChatDto):**
  ```json
  {
    "userIds": [number, number, ...] (required, array of user IDs, min 1),
    "title": "string (optional, max 50 chars, for group chats)"
  }
  ```
- **Response:**
  ```json
  {
    "id": number,
    "type": 0,
    "title": string|null,
    "createdAt": "ISO-8601",
    "participants": [
      {
        "chatId": number,
        "userId": number,
        "joinedAt": "ISO-8601",
        "lastReadAt": "ISO-8601|null"
      }
    ],
    "messages": []
  }
  ```

### Get User's Conversations
**Endpoint:** `GET /api/chat/rooms?limit={limit}`
- **Guard:** JwtAuthGuard (required)
- **Query Params:** `limit` (optional, default 50, min 1)
- **Response:** Array of chat rooms with participants and recent messages

### Get Chat History
**Endpoint:** `GET /api/chat/rooms/:id/messages?limit={limit}&offset={offset}`
- **Guard:** JwtAuthGuard (required)
- **Path Params:** `id` (chat ID)
- **Query Params:**
  - `limit` (optional, default 20, min 1, max 100)
  - `offset` (optional, default 0, min 0)
- **Response:** Array of messages for the chat room

### Send Message
**Endpoint:** `POST /api/chat/messages`
- **Guard:** JwtAuthGuard (required)
- **Request Body (SendMessageDto):**
  ```json
  {
    "chatId": number (required),
    "content": "string (required, non-empty)",
    "isGif": boolean (optional)
  }
  ```
- **Response:**
  ```json
  {
    "id": number,
    "chatId": number,
    "senderId": number,
    "content": string,
    "createdAt": "ISO-8601",
    "editedAt": null,
    "deletedAt": null,
    "sender": { user object }
  }
  ```

### Edit Message
**Endpoint:** `PATCH /api/chat/messages/:id`
- **Guard:** JwtAuthGuard (required)
- **Path Params:** `id` (message ID)
- **Request Body (EditMessageDto):**
  ```json
  {
    "content": "string (required, non-empty)"
  }
  ```
- **Response:** Updated message object with editedAt timestamp

### Delete Message
**Endpoint:** `DELETE /api/chat/messages/:id`
- **Guard:** JwtAuthGuard (required)
- **Path Params:** `id` (message ID)
- **Response:** Deleted message object (with deletedAt timestamp, not truly deleted from DB)

### Mark Chat as Read
**Endpoint:** `PATCH /api/chat/rooms/:id/read`
- **Guard:** JwtAuthGuard (required)
- **Path Params:** `id` (chat ID)
- **Response:**
  ```json
  {
    "chatId": number,
    "userId": number,
    "lastReadAt": "ISO-8601"
  }
  ```

### Leave Group Chat
**Endpoint:** `DELETE /api/chat/rooms/:id/leave`
- **Guard:** JwtAuthGuard (required)
- **Path Params:** `id` (chat ID)
- **Response:**
  ```json
  {
    "message": "Left chat room successfully"
  }
  ```

### WebSocket Events
**Gateway URL:** `ws://localhost/socket.io/`
- **Connection Events:**
  - `connection`: Client connects, server emits "Welcome to Chat Server!"
  - `disconnect`: Client disconnects, logs to console
- **Message Events:**
  - `sendMessage`: Client sends message payload
  - `message`: Server broadcasts message to all connected clients

---

## 6. NOTIFICATIONS SYSTEM

**Purpose:** Deliver real-time user notifications (friend requests, messages, tournament updates, system alerts) via WebSocket connection. Frontend displays notifications as auto-dismissing toast messages.

**Frontend Integration:** Notifications are rendered through Pinia store at `frontend/src/stores/notifications.ts`. The frontend listens for `notification:new` WebSocket events and displays them immediately.

### Notification Types
```typescript
type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  type: NotificationType
  message: string
  duration?: number  // milliseconds (0 = no auto-dismiss)
}
```

### WebSocket Event: notification:new
**Emitted by:** Backend server
**Listened by:** Frontend client
**Payload:**
```json
{
  "type": "success|error|warning|info",
  "message": "string (required)",
  "duration": 3000
}
```

### Notification Scenarios

#### Friend System
- **Friend Request Received**: `type: 'info'`, message: "New friend request from @username"
- **Friend Request Accepted**: `type: 'success'`, message: "@username accepted your friend request"
- **Friend Removed**: `type: 'warning'`, message: "You were removed by @username"
- **User Blocked**: `type: 'error'`, message: "You have been blocked by @username"

#### Tournament System
- **Tournament Registration Confirmed**: `type: 'success'`, message: "Registration confirmed for Tournament Name"
- **Tournament Starting Soon**: `type: 'warning'`, message: "Tournament starts in 15 minutes"
- **Match History Updated**: `type: 'info'`, message: "New match recorded: Win vs @opponent"

#### Chat
- **New Message**: `type: 'info'`, message: "@username sent you a message"
- **Group Chat Created**: `type: 'success'`, message: "Added to group chat: Group Name"

#### System
- **Session Alert**: `type: 'warning'`, message: "Your session will expire in 5 minutes"
- **Account Alert**: `type: 'error'`, message: "Suspicious login detected from new location"

### Implementation Notes
- Notifications are sent through the existing Socket.io WebSocket connection
- No new HTTP endpoint is needed
- Server should emit to specific user or broadcast to all connected clients
- Frontend automatically dismisses `success` and `info` notifications after 3 seconds
- `warning` and `error` persist longer or until user closes them
- Maximum 3 concurrent notifications on screen (oldest dismissed when limit reached)

---

## 7. MATCH HISTORY MODULE

**Purpose:** Track and display match history for users, integrating with external gaming APIs (chess.com, Dota 2, etc.) to fetch historical match data. Provides statistics, ELO tracking, and match details to users.

**Frontend Integration:** Match history is displayed at `/menu/match-history` with filters, pagination, and statistics. Frontend stores are located at `frontend/src/stores/` and components at `frontend/src/pages/menu/MatchHistoryCard.vue`.

### Data Structure

**Frontend expects Match object:**
```typescript
interface Match {
  id: string | number
  gameType: string  // 'Chess', 'Dota2', 'Counter-Strike', 'League-of-Legends', etc.
  opponent: {
    id: number
    username: string
    rating: number
  }
  result: 'win' | 'loss'
  score: {
    userScore: number
    opponentScore: number
  }
  duration: string  // e.g., "42 min"
  date: string  // ISO-8601 datetime
  eloChange: number  // e.g., +15, -8
  gameLink?: string  // Optional: URL to match on external platform
}
```

### REST Endpoints

#### Get Match History
**Endpoint:** `GET /api/match-history`

**Guard:** JwtAuthGuard (required)

**Query Parameters:**
- `userId`: number (optional, defaults to current authenticated user)
- `gameType`: string (optional, filter by game type)
- `limit`: number (optional, default 10, max 100)
- `offset`: number (optional, default 0 for pagination)

**Response:**
```json
{
  "matches": [
    {
      "id": "match-12345",
      "gameType": "Chess",
      "opponent": {
        "id": 42,
        "username": "player_alpha",
        "rating": 1650
      },
      "result": "win",
      "score": {
        "userScore": 1,
        "opponentScore": 0
      },
      "duration": "42 min",
      "date": "2026-02-05T14:30:00Z",
      "eloChange": 15,
      "gameLink": "https://chess.com/live/game/12345"
    }
  ],
  "total": 47,
  "page": 0,
  "limit": 10,
  "gameTypes": ["Chess", "Dota2", "Counter-Strike"]
}
```

**Process:**
1. Get current user if userId not specified
2. Fetch matches from database or external API
3. Sort by date (newest first)
4. Apply filters (gameType if specified)
5. Apply pagination (offset and limit)
6. Return matches with total count

#### Record New Match
**Endpoint:** `POST /api/match-history`

**Guard:** JwtAuthGuard (required)

**Request Body:**
```json
{
  "gameType": "Chess",
  "opponentId": 42,
  "result": "win",
  "score": {
    "userScore": 1,
    "opponentScore": 0
  },
  "gameLink": "https://chess.com/live/game/12345",
  "duration": 2520
}
```

**Response:**
```json
{
  "id": "match-789",
  "userId": 1,
  "message": "Match history recorded successfully",
  "eloChange": 15,
  "newRating": 1665
}
```

**Process:**
1. Validate opponent exists (if opponentId provided)
2. Validate game type is supported
3. Calculate ELO change based on result and rating difference
4. Store match in database
5. Update user's rating
6. Optionally send notification to user
7. Return confirmation with ELO change

### External API Integration (Optional)

#### Chess.com API Integration
**Endpoint:** `https://api.chess.com/pub/player/{username}/games/{year}/{month}`

**Purpose:** Import historical chess.com matches into match history

**Implementation:**
1. User provides chess.com username
2. Backend fetches games from Chess.com API
3. Transform Chess.com game format to internal Match format
4. Store in match_history table
5. Calculate ELO deltas from Chess.com ratings

**Example Transform:**
```typescript
// Chess.com game object
{
  url: "https://chess.com/live/game/12345",
  pgn: "...",
  time_control: "rapid",
  end_time: 1707036600,
  rated: true,
  accuracies: { white: 87.5, black: 92.1 },
  tcn: "RNBQKBNR... → ...",
  white: { rating: 1634, result: "win", username: "player_alpha" },
  black: { rating: 1650, result: "resigned", username: "opponent_name" }
}

// Transformed to Match
{
  id: "chess_12345",
  gameType: "Chess",
  opponent: { username: "opponent_name", rating: 1650 },
  result: "win",
  score: { userScore: 1, opponentScore: 0 },
  duration: "15 min",
  date: "2026-02-05T14:30:00Z",
  eloChange: 16,
  gameLink: "https://chess.com/live/game/12345"
}
```

#### Dota 2 API Integration (Optional)
**Endpoint:** `https://api.opendota.com/api/players/{steamId}/matches`

**Purpose:** Import Dota 2 matches from OpenDota API

**Data Fields:**
- Match ID from Dota 2
- Hero played
- Result (win/loss)
- Duration
- Rating/MMR change
- Opponent details

### Database Entity: MatchHistory
```typescript
{
  id: number (PK)
  userId: number (FK to User)
  gameType: string  // 'Chess', 'Dota2', 'Counter-Strike', etc.
  opponentId: number (FK to User, nullable if opponent not in system)
  opponentUsername: string  // Cache opponent name
  opponentRating: number  // Cache opponent rating at time of match
  result: 'win' | 'loss'  // Result from current user's perspective
  userScore: number
  opponentScore: number
  duration: number  // seconds
  eloChange: number  // signed integer
  userRatingBefore: number  // Rating before match
  userRatingAfter: number  // Rating after match
  externalGameLink: string (nullable)  // Link to external platform
  externalGameId: string (nullable)  // ID on external platform
  importedAt: Date (nullable)  // When imported from external API
  createdAt: Date

  // Relations
  user: User (N:1)
  opponent?: User (N:1, optional)
}
```

### Statistics Calculation

**Frontend expects aggregate stats:**
```typescript
interface MatchStatistics {
  totalMatches: number
  wins: number
  losses: number
  winRate: number  // percentage
  averageElo: number
  eloTrend: 'up' | 'down' | 'stable'
  gameTypeBreakdown: {
    [gameType: string]: {
      matches: number
      wins: number
      winRate: number
    }
  }
}
```

**Backend should calculate:**
- Total matches per user
- Win/loss counts by game type
- Average ELO across all matches
- Win rate percentage
- Recent ELO trend

---

## 8. DATA MODELS / ENTITIES

### User Entity
```typescript
{
  id: number (PK)
  username: string (unique)
  mail: string (unique)
  passwordHash: string (hashed password, not selected by default)
  role: number (0-based, default 0)
  status: number (0-based, default 0)
  banUntil: Date (nullable)
  isEmailVerified: boolean (default false)
  verificationToken: string (not selected by default)
  twoFactorEnabled: boolean (default false)
  twoFactorCode: string (not selected by default)
  firstName: string (nullable, OAuth)
  lastName: string (nullable, OAuth)
  avatarUrl: string (nullable, OAuth)
  createdAt: Date (auto-generated)

  // Relations
  profile: UserProfile (1:1)
  settings: UserSettings (1:1)
  gameAccounts: UserGameAccount[] (1:N)
  friendsInitiated: Friend[] (1:N)
  friendsReceived: Friend[] (1:N)
  blockedUsers: Block[] (1:N)
  refreshTokens: RefreshToken[] (1:N)
}
```

### UserProfile Entity
```typescript
{
  userId: number (PK, FK to User)
  displayName: string (nullable)
  avatarUrl: string (nullable)
  bio: string (nullable, text type)
  createdAt: Date (auto-generated)

  // Relations
  user: User (1:1)
}
```

### UserSettings Entity
```typescript
{
  userId: number (PK, FK to User)
  language: string (default 'en', max 10 chars)
  timezone: string (nullable, max 50 chars)
  theme: number (0=System, 1=Light, 2=Dark, default 0)
  openMessage: boolean (default false)
  createdAt: Date (auto-generated)

  // Relations
  user: User (1:1)
}
```

### RefreshToken Entity
```typescript
{
  id: number (PK)
  token: string
  userId: number (FK)
  expiresAt: Date
  createdAt: Date (auto-generated)

  // Relations
  user: User (N:1)
}
```

### Friend Entity
```typescript
{
  user1: number (PK, FK, lower user ID)
  user2: number (PK, FK, higher user ID)
  status: number (0=pending, 1=accepted, 2=blocked, default 0)
  createdAt: Date (auto-generated)

  // Relations
  user1Entity: User (N:1)
  user2Entity: User (N:1)

  // Constraints
  Unique composite index on (user1, user2)
}
```

### Block Entity
```typescript
{
  id: number (PK)
  blocker: User (N:1, who is blocking)
  blocked: User (N:1, who is blocked)
  reason: string (nullable)
  createdAt: Date (auto-generated)
}
```

### Chat Entity
```typescript
{
  id: number (PK)
  type: number (0=DM, nullable for group types)
  title: string (nullable, for group chats)
  createdAt: Date (auto-generated)

  // Relations
  participants: ChatParticipant[] (1:N)
  messages: Message[] (1:N)
}
```

### Message Entity
```typescript
{
  id: number (PK)
  chatId: number (FK)
  senderId: number (FK)
  content: string (text type)
  createdAt: Date (auto-generated)
  editedAt: Date (nullable, timestamp)
  deletedAt: Date (nullable, soft delete)

  // Relations
  chat: Chat (N:1)
  sender: User (N:1)
}
```

### ChatParticipant Entity
```typescript
{
  chatId: number (PK, FK)
  userId: number (PK, FK)
  joinedAt: Date (auto-generated)
  lastReadAt: Date (nullable, timestamp)

  // Relations
  chat: Chat (N:1)
  user: User (N:1)
}
```

---

## 9. AUTHENTICATION GUARDS & STRATEGIES

### JwtAuthGuard
- Extends Passport's AuthGuard('jwt')
- **Required for:** All protected endpoints
- **Behavior:** Rejects requests without valid Bearer token in Authorization header
- **Returns:** Throws 401 Unauthorized if invalid/missing

### OptionalJwtAuthGuard
- Custom implementation
- **Used for:** Register, Login (prevents logged-in users from accessing)
- **Behavior:** Verifies token if present, but allows request if missing or invalid
- **Attaches user to request if token is valid**

### JwtStrategy
- Passport strategy for JWT validation
- **Extracts token from:** Authorization header as Bearer token
- **Validates:**
  1. JWT signature using JWT_SECRET
  2. Token expiration
  3. User exists in database
- **Payload format:** `{ sub: userId, username: string }`
- **Returns to request:** `{ sub: userId, username: string }`

### GoogleStrategy
- Passport strategy for OAuth 2.0
- **Scope:** email, profile
- **Callback URL:** `http://localhost/api/auth/google/callback`
- **Returns user data:**
  ```typescript
  {
    email: string,
    firstName: string,
    lastName: string,
    picture: string,
    accessToken: string
  }
  ```

---

## 10. KEY IMPLEMENTATION DETAILS

### JWT Configuration
- **Secret:** Read from JWT_SECRET environment variable
- **Access Token Expiry:** 24 hours (configurable)
- **Refresh Token Expiry:** 7 days
- **Stored in Database:** RefreshToken table (allows revocation)

### Password Security
- **Hash Algorithm:** bcryptjs with 10 salt rounds
- **Never Selected by Default:** passwordHash column is set `select: false` to prevent accidental exposure

### Email Verification
- **Token Generation:** crypto.randomBytes(32).toString('hex') - 64-char hex string
- **Token Usage:** Stored in User.verificationToken, cleared after use

### Friend Status Values
- `0` = Pending (request sent)
- `1` = Accepted (confirmed)
- `2` = Blocked (deprecated usage in Friend entity)

### Message Soft Delete
- **Deleted messages NOT removed from DB**
- **deletedAt column set to timestamp**
- **Queries should filter WHERE deletedAt IS NULL**

### Database Settings
- **Synchronize:** Enabled in dev (`DB_SYNCHRONIZE=true`)
- **Auto-creates schema from entity definitions**
- **Entity pattern:** `/**/*.entity{.ts,.js}`

### CORS Configuration
- **Origin:** `http://localhost:5173` (frontend)
- **Methods:** GET, HEAD, PUT, PATCH, POST, DELETE
- **Credentials:** Enabled

### Global Validation Pipe
- **Whitelist:** Removes unknown properties
- **Forbid Non-Whitelisted:** Throws error on unknown properties
- **Transform:** Auto-converts query params to proper types

---

## 11. MISSING IMPLEMENTATIONS / NOTES

1. **FriendsModule & ChatModule not imported** in app.module.ts
   - Endpoints exist but are not accessible
   - Need to add imports and potentially register as microservices

2. **Chat REST endpoints** may be incomplete
   - Need proper authentication on ChatController
   - Some endpoints missing req.user guard decorator

3. **WebSocket security** is open (CORS: '*')
   - Should restrict to frontend URL in production

4. **Friend status transitions** not implemented
   - Accept/reject friend request flow not defined
   - Status 2 (blocked) usage unclear in Friend entity

5. **Blocking system** has dedicated Block entity
   - Different from Friend status=2
   - Full implementation present

6. **Chat privacy/permissions** implemented in ChatPrivacyService
   - Restricts access based on friendship/blocking status

---

## 12. ALL ENDPOINTS SUMMARY TABLE

| Method | Endpoint | Guard | Status | Module |
|--------|----------|-------|--------|--------|
| POST | /api/auth/register | OptionalJwt | Active | Auth |
| GET | /api/auth/verify-email | None | Active | Auth |
| POST | /api/auth/login | OptionalJwt | Active | Auth |
| POST | /api/auth/logout | Jwt | Active | Auth |
| POST | /api/auth/refresh | None | Active | Auth |
| POST | /api/auth/2fa/enable | Jwt | Active | Auth |
| POST | /api/auth/2fa/confirm | Jwt | Active | Auth |
| POST | /api/auth/2fa/verify | None | Active | Auth |
| POST | /api/auth/2fa/disable | Jwt | Active | Auth |
| GET | /api/auth/google | Google | Active | Auth |
| GET | /api/auth/google/callback | Google | Active | Auth |
| GET | /api/users/me | Jwt | Active | Users |
| POST | /api/users | None | Active | Users |
| PATCH | /api/users/:id/settings | None | Active | Users |
| PATCH | /api/users/:id/profile | None | Active | Users |
| DELETE | /api/users/:id | None | Active | Users |
| POST | /api/social/friends | Jwt | **Not Imported** | Friends |
| DELETE | /api/social/friends | Jwt | **Not Imported** | Friends |
| GET | /api/social/friends | Jwt | **Not Imported** | Friends |
| POST | /api/social/blocks | Jwt | **Not Imported** | Friends |
| DELETE | /api/social/blocks | Jwt | **Not Imported** | Friends |
| GET | /api/social/blocks | Jwt | **Not Imported** | Friends |
| POST | /api/chat/rooms | Jwt | **Not Imported** | Chat |
| GET | /api/chat/rooms | Jwt | **Not Imported** | Chat |
| GET | /api/chat/rooms/:id/messages | Jwt | **Not Imported** | Chat |
| POST | /api/chat/messages | Jwt | **Not Imported** | Chat |
| PATCH | /api/chat/messages/:id | Jwt | **Not Imported** | Chat |
| DELETE | /api/chat/messages/:id | Jwt | **Not Imported** | Chat |
| PATCH | /api/chat/rooms/:id/read | Jwt | **Not Imported** | Chat |
| DELETE | /api/chat/rooms/:id/leave | Jwt | **Not Imported** | Chat |
