# Frontend Development Guide

## Current Frontend State & Architecture

---

## 1. PROJECT STRUCTURE

```
frontend/
├── src/
│   ├── api/                 # ✅ NEW: API service layer
│   │   ├── index.ts         # Base fetch wrapper with auth & token refresh
│   │   ├── auth.ts          # Auth API calls
│   │   ├── users.ts         # Users API calls
│   │   └── __tests__/       # API unit tests
│   ├── types/               # ✅ NEW: TypeScript interfaces
│   │   ├── index.ts         # Re-exports all types
│   │   ├── api.ts           # API layer types
│   │   ├── auth.ts          # Auth types
│   │   └── user.ts          # User, Profile, Settings types
│   ├── assets/              # CSS stylesheets
│   │   ├── base.css         # Base CSS variables and resets
│   │   ├── main.css         # Main app styles (dark theme with gradient)
│   │   └── logo.svg
│   ├── components/          # Reusable Vue components
│   │   ├── dashboard/       # Dashboard-specific cards
│   │   │   ├── BackendCard.vue      # Backend connectivity test
│   │   │   ├── ChatCard.vue         # Real-time chat display
│   │   │   ├── ProfileCard.vue      # User profile display
│   │   │   └── TwoFactorCard.vue    # 2FA management UI
│   │   ├── icons/           # Icon components (unused SVG components)
│   │   ├── HelloWorld.vue
│   │   ├── LoginPage.vue    # Login/Register component
│   │   ├── TheWelcome.vue
│   │   └── WelcomeItem.vue
│   ├── pages/               # Page-level components (routes)
│   │   ├── Dashboard.vue    # Main dashboard (protected route)
│   │   ├── LoginSuccess.vue # OAuth callback handler
│   │   ├── TwoFactorVerify.vue # 2FA verification page
│   │   └── VerifyEmail.vue  # Email verification page
│   ├── composables/         # Vue composition API utilities
│   │   ├── useAuth.ts       # Authentication composable (uses API layer)
│   │   ├── useTwoFactor.ts  # 2FA management composable (uses API layer)
│   │   └── __tests__/       # Composable unit tests
│   ├── router/              # Vue Router configuration
│   │   └── index.js         # Route definitions
│   ├── App.vue              # Root component
│   └── main.js              # Application entry point
├── public/                  # Static assets
├── vite.config.js           # Vite build configuration
├── vitest.config.ts         # ✅ NEW: Vitest test configuration
├── package.json             # Dependencies
└── index.html               # HTML entry point
```

---

## 2. EXISTING ROUTES

| Route | Path | Component | Auth Required |
|-------|------|-----------|---------------|
| dashboard | `/` | Dashboard.vue | Yes |
| login | `/login` | LoginPage.vue | No |
| LoginSuccess | `/login-success` | LoginSuccess.vue | No (OAuth callback) |
| verify-email | `/verify-email` | VerifyEmail.vue | No |
| verify-2fa | `/verify-2fa` | TwoFactorVerify.vue | No |

**Route Guard:** Checks `localStorage.accessToken` before navigation to protected routes.

---

## 3. EXISTING PAGES

### Dashboard.vue
- Protected landing page after login
- Fetches user profile via `/api/users/me`
- Displays 4 dashboard cards: ProfileCard, BackendCard, ChatCard, TwoFactorCard
- Logout button

### LoginPage.vue
- Combined Login/Register form with toggle
- Google OAuth button
- Handles 2FA redirect

### LoginSuccess.vue
- Google OAuth callback handler
- Extracts tokens from URL query params

### VerifyEmail.vue
- Email verification via token in query param

### TwoFactorVerify.vue
- 6-digit code input for 2FA during login

---

## 4. EXISTING COMPOSABLES

### useAuth.ts
```typescript
- isAuthenticated: ref<boolean>
- user: ref<User | null>
- isLoading: ref<boolean>
- checkAuth(): Promise<boolean>  // Validates token via usersApi.getMe()
- logout(): Promise<void>        // Calls authApi.logout(), clears storage
```

### useTwoFactor.ts
```typescript
- enabled: ref<boolean>
- loading: ref<boolean>
- message: ref<string>
- showForm: ref<boolean>
- code: ref<string>
- isFetching: ref<boolean>

Methods:
- fetchStatus()    // Uses usersApi.getMe()
- enable()         // Uses authApi.enable2FA()
- confirm()        // Uses authApi.confirm2FA()
- disable()        // Uses authApi.disable2FA()
```

---

## 5. API SERVICE LAYER (Phase 1 Complete ✅)

### Directory Structure
```
frontend/src/
├── api/
│   ├── index.ts          # Base API client with auth & token refresh
│   ├── auth.ts           # Auth API (login, register, 2FA, OAuth)
│   └── users.ts          # Users API (profile, settings)
├── types/
│   ├── index.ts          # Re-exports all types
│   ├── api.ts            # ApiError, RequestOptions, pagination
│   ├── auth.ts           # Auth request/response types
│   └── user.ts           # User, Profile, Settings types
```

### Base API Client (`api/index.ts`)
- Generic fetch wrapper with authentication
- Automatic token refresh on 401
- Race condition prevention for concurrent requests
- Token storage management (localStorage)

### Auth API (`api/auth.ts`)
```typescript
authApi.login(data)           // POST /auth/login
authApi.register(data)        // POST /auth/register
authApi.logout()              // POST /auth/logout
authApi.refresh(token)        // POST /auth/refresh
authApi.verifyEmail(token)    // GET /auth/verify-email
authApi.enable2FA()           // POST /auth/2fa/enable
authApi.confirm2FA(data)      // POST /auth/2fa/confirm
authApi.verify2FA(data)       // POST /auth/2fa/verify
authApi.disable2FA()          // POST /auth/2fa/disable
authApi.googleLogin()         // Redirect to /api/auth/google
authApi.handleOAuthCallback() // Store OAuth tokens
```

### Users API (`api/users.ts`)
```typescript
usersApi.getMe()                      // GET /users/me
usersApi.updateProfile(userId, data)  // PATCH /users/:id/profile
usersApi.updateSettings(userId, data) // PATCH /users/:id/settings
usersApi.deleteAccount(userId)        // DELETE /users/:id
```

---

## 6. TESTING INFRASTRUCTURE ✅

### Setup
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run with Vitest UI
npm run test:coverage # Generate coverage report
```

### Test Files
```
frontend/src/
├── api/__tests__/
│   ├── index.spec.ts        # API client tests (22 tests)
│   ├── auth.spec.ts         # Auth API tests (14 tests)
│   └── users.spec.ts        # Users API tests (7 tests)
├── composables/__tests__/
│   ├── useAuth.spec.ts      # Auth composable tests (7 tests)
│   └── useTwoFactor.spec.ts # 2FA composable tests (14 tests)
```

### Coverage: 64 tests, all passing ✅

---

## 6. STYLING

- **No CSS framework** - Vanilla CSS with scoped styles
- **Dark theme** with purple gradients
- **Color palette:**
  - Primary: `#667eea` → `#764ba2`
  - Success: `#42b883`
  - Error: `#ff6b6b`
  - Dark BG: `#2c2c2c`, `#1a1a1a`

---

## 7. DEPENDENCIES

```json
{
  "dependencies": {
    "vue": "^3.5.26",
    "vue-router": "^4.6.4",
    "socket.io-client": "^4.8.3"
  }
}
```

---

# WHAT NEEDS TO BE BUILT

## Recommended Directory Structure Additions

```
frontend/src/
├── api/                     # NEW: API service layer
│   ├── index.ts             # Base fetch wrapper with auth
│   ├── auth.ts              # Auth API calls
│   ├── users.ts             # Users API calls
│   ├── friends.ts           # Friends API calls
│   └── chat.ts              # Chat API calls
├── stores/                  # NEW: Pinia stores (optional)
│   ├── auth.ts              # Auth state
│   ├── user.ts              # User profile state
│   └── chat.ts              # Chat state
├── types/                   # NEW: TypeScript interfaces
│   ├── user.ts              # User, Profile, Settings types
│   ├── auth.ts              # Auth response types
│   ├── friend.ts            # Friend, Block types
│   └── chat.ts              # Chat, Message types
├── components/
│   ├── friends/             # NEW: Friends components
│   │   ├── FriendsList.vue
│   │   ├── FriendCard.vue
│   │   ├── FriendRequests.vue
│   │   └── BlockedUsers.vue
│   ├── chat/                # NEW: Chat components
│   │   ├── ChatSidebar.vue
│   │   ├── ChatWindow.vue
│   │   ├── MessageList.vue
│   │   ├── MessageInput.vue
│   │   └── ChatParticipants.vue
│   ├── profile/             # NEW: Profile components
│   │   ├── ProfileEdit.vue
│   │   ├── SettingsForm.vue
│   │   └── AvatarUpload.vue
│   └── common/              # NEW: Shared UI components
│       ├── Toast.vue
│       ├── Modal.vue
│       ├── LoadingSpinner.vue
│       └── ErrorMessage.vue
├── pages/
│   ├── Friends.vue          # NEW: Friends page
│   ├── Chat.vue             # NEW: Full chat page
│   ├── Profile.vue          # NEW: Profile edit page
│   └── Settings.vue         # NEW: User settings page
```

---

# CONNECTING FRONTEND TO BACKEND MODULES

## 1. API SERVICE LAYER (Recommended First Step)

Create `/src/api/index.ts`:
```typescript
const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export async function api<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (auth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
```

---

## 2. AUTH MODULE CONNECTION

### Files to Create/Modify

**`/src/api/auth.ts`:**
```typescript
import { api } from './index';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  mail: string;
  password: string;
}

export interface AuthResponse {
  user: { id: number; username: string; mail: string };
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorResponse {
  requiresTwoFactor: true;
  userId: number;
  message: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api<AuthResponse | TwoFactorResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    }),

  register: (data: RegisterRequest) =>
    api<{ message: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    }),

  logout: () =>
    api<{ message: string }>('/auth/logout', { method: 'POST' }),

  refresh: (refreshToken: string) =>
    api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      auth: false,
    }),

  verifyEmail: (token: string) =>
    api<{ message: string }>(`/auth/verify-email?token=${token}`, {
      method: 'GET',
      auth: false,
    }),

  // 2FA
  enable2FA: () =>
    api<{ message: string }>('/auth/2fa/enable', { method: 'POST' }),

  confirm2FA: (code: string) =>
    api<{ message: string }>('/auth/2fa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  verify2FA: (userId: number, code: string) =>
    api<AuthResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
      auth: false,
    }),

  disable2FA: () =>
    api<{ message: string }>('/auth/2fa/disable', { method: 'POST' }),

  // Google OAuth - just redirect
  googleLogin: () => {
    window.location.href = '/api/auth/google';
  },
};
```

---

## 3. USERS MODULE CONNECTION

**`/src/api/users.ts`:**
```typescript
import { api } from './index';

export interface User {
  id: number;
  username: string;
  mail: string;
  twoFactorEnabled: boolean;
  profile: UserProfile;
  settings: UserSettings;
}

export interface UserProfile {
  userId: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface UserSettings {
  userId: number;
  language: 'en' | 'fr' | 'tr' | 'nl' | 'ko';
  timezone: string | null;
  theme: 0 | 1 | 2; // 0=System, 1=Light, 2=Dark
  openMessage: boolean;
  createdAt: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UpdateSettingsDto {
  language?: 'en' | 'fr' | 'tr' | 'nl' | 'ko';
  timezone?: string;
  theme?: 0 | 1 | 2;
}

export const usersApi = {
  getMe: () => api<User>('/users/me'),

  updateProfile: (userId: number, data: UpdateProfileDto) =>
    api<UserProfile>(`/users/${userId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSettings: (userId: number, data: UpdateSettingsDto) =>
    api<UserSettings>(`/users/${userId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAccount: (userId: number) =>
    api<{ message: string }>(`/users/${userId}`, { method: 'DELETE' }),
};
```

**Page to Create: `/src/pages/Profile.vue`**
- Edit display name, bio, avatar
- Form with PATCH to `/api/users/:id/profile`

**Page to Create: `/src/pages/Settings.vue`**
- Language selector (en, fr, tr, nl, ko)
- Theme toggle (System/Light/Dark)
- PATCH to `/api/users/:id/settings`

---

## 4. FRIENDS MODULE CONNECTION

**Note:** Backend FriendsModule needs to be imported in `app.module.ts` first!

**`/src/api/friends.ts`:**
```typescript
import { api } from './index';

export interface Friend {
  user1: number;
  user2: number;
  status: 0 | 1 | 2; // 0=pending, 1=accepted, 2=blocked
  createdAt: string;
}

export interface Block {
  id: number;
  blocker: { id: number; username: string };
  blocked: { id: number; username: string };
  reason: string | null;
  createdAt: string;
}

export const friendsApi = {
  // Friends
  getFriends: (userId: number) =>
    api<Friend[]>(`/social/friends?myId=${userId}`),

  addFriend: (friendId: number) =>
    api<Friend>('/social/friends', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    }),

  removeFriend: (friendId: number) =>
    api<Friend>('/social/friends', {
      method: 'DELETE',
      body: JSON.stringify({ friendId }),
    }),

  // Blocks
  getBlocked: (userId: number) =>
    api<Block[]>(`/social/blocks?myId=${userId}`),

  blockUser: (targetId: number, reason?: string) =>
    api<Block>('/social/blocks', {
      method: 'POST',
      body: JSON.stringify({ targetId, reason }),
    }),

  unblockUser: (targetId: number) =>
    api<Block>('/social/blocks', {
      method: 'DELETE',
      body: JSON.stringify({ targetId }),
    }),
};
```

**Components to Create:**

1. **`/src/components/friends/FriendsList.vue`**
   - List all friends (status=1)
   - Remove friend button
   - Click to open chat

2. **`/src/components/friends/FriendRequests.vue`**
   - Pending requests (status=0)
   - Accept/Reject buttons

3. **`/src/components/friends/BlockedUsers.vue`**
   - List blocked users
   - Unblock button

4. **`/src/pages/Friends.vue`**
   - Tab layout: Friends | Requests | Blocked
   - User search to add friends

---

## 5. CHAT MODULE CONNECTION

**Note:** Backend ChatModule needs to be imported in `app.module.ts` first!

**`/src/api/chat.ts`:**
```typescript
import { api } from './index';

export interface Chat {
  id: number;
  type: number;
  title: string | null;
  createdAt: string;
  participants: ChatParticipant[];
  messages: Message[];
}

export interface ChatParticipant {
  chatId: number;
  userId: number;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  sender: { id: number; username: string };
}

export interface CreateChatDto {
  userIds: number[];
  title?: string;
}

export interface SendMessageDto {
  chatId: number;
  content: string;
  isGif?: boolean;
}

export const chatApi = {
  // Rooms
  getRooms: (limit = 50) =>
    api<Chat[]>(`/chat/rooms?limit=${limit}`),

  createRoom: (data: CreateChatDto) =>
    api<Chat>('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMessages: (chatId: number, limit = 20, offset = 0) =>
    api<Message[]>(`/chat/rooms/${chatId}/messages?limit=${limit}&offset=${offset}`),

  markAsRead: (chatId: number) =>
    api<ChatParticipant>(`/chat/rooms/${chatId}/read`, { method: 'PATCH' }),

  leaveChat: (chatId: number) =>
    api<{ message: string }>(`/chat/rooms/${chatId}/leave`, { method: 'DELETE' }),

  // Messages
  sendMessage: (data: SendMessageDto) =>
    api<Message>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editMessage: (messageId: number, content: string) =>
    api<Message>(`/chat/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (messageId: number) =>
    api<Message>(`/chat/messages/${messageId}`, { method: 'DELETE' }),
};
```

**WebSocket Integration (`/src/composables/useChat.ts`):**
```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export function useChat() {
  const socket = ref<Socket | null>(null);
  const messages = ref<any[]>([]);
  const connected = ref(false);

  const connect = () => {
    socket.value = io('/', {
      path: '/socket.io/',
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    });

    socket.value.on('connect', () => {
      connected.value = true;
    });

    socket.value.on('message', (msg) => {
      messages.value.push(msg);
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });
  };

  const sendMessage = (chatId: number, content: string) => {
    socket.value?.emit('sendMessage', { chatId, content });
  };

  const disconnect = () => {
    socket.value?.disconnect();
  };

  onMounted(connect);
  onUnmounted(disconnect);

  return { messages, connected, sendMessage };
}
```

**Components to Create:**

1. **`/src/components/chat/ChatSidebar.vue`**
   - List of conversations
   - Unread message indicators
   - Click to select chat

2. **`/src/components/chat/ChatWindow.vue`**
   - Message history display
   - Auto-scroll to bottom
   - Load more on scroll up

3. **`/src/components/chat/MessageInput.vue`**
   - Text input
   - Send button
   - GIF toggle (if supporting)

4. **`/src/pages/Chat.vue`**
   - Two-column layout: Sidebar + Window
   - Create new chat button
   - WebSocket connection management

---

## 6. ROUTES TO ADD

Update `/src/router/index.js`:
```javascript
const routes = [
  // ... existing routes
  {
    path: '/friends',
    name: 'friends',
    component: () => import('../pages/Friends.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../pages/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:id',
    name: 'chat-room',
    component: () => import('../pages/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/Settings.vue'),
    meta: { requiresAuth: true }
  },
]
```

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Foundation ✅ COMPLETE
1. ✅ Create `/src/api/index.ts` (base API wrapper with token refresh)
2. ✅ Create `/src/types/` folder with TypeScript interfaces
3. ✅ Refactor existing composables to use new API layer
4. ✅ Set up Vitest testing infrastructure
5. ✅ Write unit tests (64 tests)

### Phase 2: Complete Auth Module Connection (IN PROGRESS)
6. Update LoginPage.vue to use authApi
7. Update Dashboard.vue to use usersApi
8. Update TwoFactorVerify.vue to use authApi.verify2FA
9. Build Profile.vue page (edit display name, bio, avatar)
10. Build Settings.vue page (language, theme, timezone)
11. Add routes for /profile and /settings

### Phase 3: Social Features (Requires backend import)
12. Import FriendsModule in backend's app.module.ts
13. Create `/src/api/friends.ts`
14. Create `/src/types/friend.ts`
15. Build Friends.vue page with tabs: Friends | Requests | Blocked
16. Build FriendsList.vue, FriendRequests.vue, BlockedUsers.vue components
17. Add user search functionality
18. Add /friends route

### Phase 4: Chat (Requires backend import)
19. Import ChatModule in backend's app.module.ts
20. Create `/src/api/chat.ts`
21. Create `/src/types/chat.ts`
22. Create `/src/composables/useChat.ts` (WebSocket)
23. Build Chat.vue page with sidebar and chat window
24. Build ChatSidebar.vue, ChatWindow.vue, MessageInput.vue components
25. Add /chat and /chat/:id routes

### Phase 5: Polish
26. Add toast notifications system
27. Add loading states consistency
28. Error boundary components
29. Add common UI components (Modal, LoadingSpinner, etc.)

---

## 8. BACKEND PREREQUISITES

Before building Friends and Chat frontend, the backend needs these modules imported:

**File:** `/backend/src/app.module.ts`
```typescript
import { FriendsModule } from './modules/friends/friends.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    // ... existing imports
    FriendsModule,  // ADD THIS
    ChatModule,     // ADD THIS
  ],
})
export class AppModule {}
```

---

## 9. KEY FILE PATHS

**Existing files to reference:**
- `/home/slang/42-Transcendence/frontend/src/router/index.js`
- `/home/slang/42-Transcendence/frontend/src/pages/Dashboard.vue`
- `/home/slang/42-Transcendence/frontend/src/components/LoginPage.vue`
- `/home/slang/42-Transcendence/frontend/src/composables/useAuth.ts`
- `/home/slang/42-Transcendence/frontend/src/composables/useTwoFactor.ts`
- `/home/slang/42-Transcendence/frontend/src/components/dashboard/*.vue`
- `/home/slang/42-Transcendence/frontend/src/assets/main.css`

**Backend files for reference:**
- `/home/slang/42-Transcendence/backend/src/app.module.ts`
- `/home/slang/42-Transcendence/backend/src/modules/auth/auth.controller.ts`
- `/home/slang/42-Transcendence/backend/src/modules/users/users.controller.ts`
- `/home/slang/42-Transcendence/backend/src/modules/friends/friends.controller.ts`
- `/home/slang/42-Transcendence/backend/src/modules/chat/chat.controller.ts`
