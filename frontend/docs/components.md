# Component Reference

## Layouts

### MenuLayout.vue

**Location:** `src/layouts/MenuLayout.vue`
**Lines:** 186

**Purpose:** Main authenticated layout providing header, navigation, and content area for the menu section.

**Props:** None

**Events:** None

**Slots:**
- Default slot via `<RouterView>` for nested route content

**Features:**
- Auth check on mount (redirects to `/auth` if invalid)
- Theme toggle in header
- Logout button
- Navigation with active state indication
- Card slide transition between pages

**Usage:** Used as parent route component for all `/menu/*` routes.

**Template Structure:**
```
div.menu-layout
  header.menu-header
    h1.menu-title "ESPORTENDENCE"
    div.menu-header-actions
      ThemeToggle
      button.menu-quit-btn "QUIT"
  nav.menu-nav
    RouterLink (for each nav item)
  main.menu-content
    RouterView with Transition
```

---

## Pages

### Auth Pages

#### AuthPage.vue

**Location:** `src/pages/auth/AuthPage.vue`
**Lines:** 377

**Purpose:** Combined login and registration form.

**Features:**
- Toggle between login and register modes
- Form validation
- Google OAuth button
- Auto-redirect to menu if already authenticated
- 2FA redirect handling
- Success/error message display

**State:**
- `isLogin: boolean` - Toggle between login/register
- `username, email, password: string` - Form fields
- `message: string` - Status message
- `messageType: 'success' | 'error'`
- `isLoading: boolean`

---

#### VerifyEmailPage.vue

**Location:** `src/pages/auth/VerifyEmailPage.vue`
**Lines:** 186

**Purpose:** Email verification via token in URL query parameter.

**Features:**
- Reads `token` from URL query
- Calls `authApi.verifyEmail()`
- Shows loading, success, or error states
- Button to navigate to login

---

#### TwoFactorPage.vue

**Location:** `src/pages/auth/TwoFactorPage.vue`
**Lines:** 313

**Purpose:** 2FA code entry during login flow.

**Features:**
- Reads `userId` from URL query
- 6-digit code input with numeric filtering
- Auto-redirect to menu on success
- Error display with retry option

---

#### OAuthCallbackPage.vue

**Location:** `src/pages/auth/OAuthCallbackPage.vue`
**Lines:** 88

**Purpose:** Handle OAuth callback and token storage.

**Features:**
- Reads `accessToken` and `refreshToken` from URL query
- Stores tokens in localStorage
- Redirects to menu or back to auth on failure

---

### Menu Pages

#### UserCard.vue

**Location:** `src/pages/menu/UserCard.vue`
**Lines:** 132

**Purpose:** User management page with profile, settings, security, and account deletion.

**Child Components:**
- `ProfileSection` - Edit display name, bio
- `SettingsSection` - Language, theme, open messages
- `SecuritySection` - 2FA management
- `ConfirmDialog` - Delete account confirmation

**Features:**
- Refresh user data after updates
- Delete account with confirmation dialog
- Error handling for delete operation

---

#### FriendCard.vue

**Location:** `src/pages/menu/FriendCard.vue`
**Lines:** 209

**Purpose:** Friends management with tabs for friends, requests, and blocked users.

**Child Components:**
- `AddFriendInput` - Add friend by ID
- `FriendList` - Display accepted friends
- `FriendRequests` - Pending requests with accept/decline
- `BlockedUsers` - Blocked users with unblock

**Features:**
- Tab navigation (FRIENDS, REQUESTS, BLOCKED)
- Badge showing pending request count
- Success/error message display

**State:**
- `activeTab: 'friends' | 'requests' | 'blocked'`
- `message: string` - Status message

---

#### ChatCard.vue

**Location:** `src/pages/menu/ChatCard.vue`
**Lines:** 252

**Purpose:** Two-column chat interface with room list and conversation.

**Child Components:**
- `ChatRoomList` - Sidebar with room list
- `ChatConversation` - Message display area
- `MessageInput` - Text input for sending

**Features:**
- WebSocket connection management
- New chat creation by user ID
- Room selection and message loading
- Real-time message updates
- Error display

**Layout:**
```
div.chat-layout
  aside.chat-sidebar
    header + ChatRoomList
  div.chat-main
    header + ChatConversation + MessageInput
```

---

#### DevCard.vue

**Location:** `src/pages/menu/DevCard.vue`
**Lines:** 335

**Purpose:** Developer debug tools and environment information.

**Features:**
- Backend ping test with response time
- Session timer (uptime counter)
- Theme switcher (Stellar/Dragon buttons)
- Auth debug info (user, tokens, 2FA status)
- Raw user JSON display
- WebSocket connection test
- Environment info (build mode, API base, dev mode)

---

## Components

### Common Components

#### ConfirmDialog.vue

**Location:** `src/components/common/ConfirmDialog.vue`
**Lines:** 83

**Purpose:** Reusable confirmation modal dialog.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Dialog title |
| `message` | `string` | Yes | - | Dialog message |
| `confirmLabel` | `string` | No | `'CONFIRM'` | Confirm button text |
| `cancelLabel` | `string` | No | `'CANCEL'` | Cancel button text |
| `danger` | `boolean` | No | `false` | Use danger button style |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | - | User clicked confirm |
| `cancel` | - | User clicked cancel or backdrop |

**Usage:**
```vue
<ConfirmDialog
  v-if="showDialog"
  title="Delete Account"
  message="Are you sure?"
  confirm-label="DELETE"
  :danger="true"
  @confirm="handleDelete"
  @cancel="showDialog = false"
/>
```

---

#### ThemeToggle.vue

**Location:** `src/components/ThemeToggle.vue`
**Lines:** 122

**Purpose:** Toggle button for switching between Stellar and Dragon themes.

**Props:** None

**Events:** None (uses composable internally)

**Features:**
- Animated toggle track with sliding indicator
- Theme-specific icons (star for Stellar, flame for Dragon)
- Accessible with aria attributes
- Displays theme name label

---

### User Components

#### ProfileSection.vue

**Location:** `src/components/user/ProfileSection.vue`
**Lines:** 225

**Purpose:** Display and edit user profile information.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | `User` | Yes | User object |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `updated` | - | Profile was updated |

**Features:**
- Display mode: avatar, name, username, email, bio
- Edit mode: display name and bio inputs
- Initials avatar fallback

---

#### SettingsSection.vue

**Location:** `src/components/user/SettingsSection.vue`
**Lines:** 212

**Purpose:** User settings for language, theme, and message preferences.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | `User` | Yes | User object |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `updated` | - | Settings were updated |

**Features:**
- Language dropdown (en, fr, tr, nl, ko)
- Theme toggle button
- Open messages toggle switch

---

#### SecuritySection.vue

**Location:** `src/components/user/SecuritySection.vue`
**Lines:** 161

**Purpose:** Two-factor authentication management.

**Props:** None (uses `useTwoFactor` composable)

**Events:** None

**Features:**
- Fetches 2FA status on mount
- Enable button (sends code to email)
- Code confirmation form
- Disable button
- Status badge (ENABLED/DISABLED)

---

### Friends Components

#### AddFriendInput.vue

**Location:** `src/components/friends/AddFriendInput.vue`
**Lines:** 56

**Purpose:** Input field to add friend by user ID.

**Props:** None

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | `friendId: number` | User submitted valid ID |

**Features:**
- Numeric input validation
- Error message for invalid input
- Clears after successful emit

---

#### FriendList.vue

**Location:** `src/components/friends/FriendList.vue`
**Lines:** 125

**Purpose:** Display list of accepted friends.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `friends` | `Friend[]` | Yes | List of friends |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `remove` | `friendId: number` | Remove friend clicked |
| `block` | `friendId: number` | Block friend clicked |

**Features:**
- Empty state message
- Avatar with initials fallback
- Display name with username
- REMOVE and BLOCK action buttons

---

#### FriendRequests.vue

**Location:** `src/components/friends/FriendRequests.vue`
**Lines:** 100

**Purpose:** Display pending friend requests.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `requests` | `Friend[]` | Yes | Pending requests |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `accept` | `friendId: number` | Accept request clicked |
| `decline` | `friendId: number` | Decline request clicked |

**Features:**
- Empty state message
- Avatar with initials
- ACCEPT and DECLINE buttons

---

#### BlockedUsers.vue

**Location:** `src/components/friends/BlockedUsers.vue`
**Lines:** 69

**Purpose:** Display blocked users with unblock option.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `blocks` | `Block[]` | Yes | Blocked users |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `unblock` | `targetId: number` | Unblock clicked |

**Features:**
- Empty state message
- Shows username and optional reason
- UNBLOCK button

---

### Chat Components

#### ChatRoomList.vue

**Location:** `src/components/chat/ChatRoomList.vue`
**Lines:** 163

**Purpose:** Sidebar list of chat conversations.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rooms` | `ChatRoom[]` | Yes | Chat rooms |
| `activeRoomId` | `number \| null` | Yes | Currently selected room |
| `currentUserId` | `number` | Yes | Logged in user ID |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `roomId: number` | Room clicked |

**Features:**
- Empty state message
- Room name (title or other participant's username)
- Last message preview (truncated to 40 chars)
- Timestamp (time or date)
- Unread indicator dot
- Active room highlight

---

#### ChatConversation.vue

**Location:** `src/components/chat/ChatConversation.vue`
**Lines:** 66

**Purpose:** Message display area with auto-scroll.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `messages` | `Message[]` | Yes | Messages to display |
| `currentUserId` | `number` | Yes | Logged in user ID |
| `isLoading` | `boolean` | Yes | Loading state |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `deleteMessage` | `messageId: number` | Delete message requested |

**Features:**
- Loading and empty states
- Auto-scrolls to bottom on new messages
- Renders MessageBubble for each message

---

#### MessageBubble.vue

**Location:** `src/components/chat/MessageBubble.vue`
**Lines:** 136

**Purpose:** Individual message display with sender alignment.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `Message` | Yes | Message data |
| `currentUserId` | `number` | Yes | Logged in user ID |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `delete` | `messageId: number` | Delete button clicked |

**Features:**
- Sender name (for received messages)
- Message content
- Timestamp (HH:MM format)
- "edited" indicator
- Deleted message styling
- Delete button (own messages only, on hover)
- Right-aligned for own messages, left for others

---

#### MessageInput.vue

**Location:** `src/components/chat/MessageInput.vue`
**Lines:** 66

**Purpose:** Text input for composing messages.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `disabled` | `boolean` | No | Disable input |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `send` | `content: string` | Message submitted |

**Features:**
- Text input with placeholder
- Send button (disabled when empty)
- Enter key to send (without shift)
- Clears after send
