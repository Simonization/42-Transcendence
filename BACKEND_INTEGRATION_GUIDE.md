# Backend Integration Guide - Week 4 Modules

**Date**: 2026-02-08
**For**: Backend Team (Ahmet, Louis, Nicolas)
**Status**: Frontend ready for integration

---

## Quick Links

- **Frontend Status**: `/home/slang/42-Transcendence/FRONTEND_READY.md`
- **Backend Architecture**: `/docs/backend_architecture.md`
- **This Guide**: `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md`

---

## 1. CHAT & WEBSOCKET (Ahmet's Module)

### Frontend Readiness: ✅ READY

**Location**: `/docs/backend_architecture.md` - Section 5: CHAT MODULE ENDPOINTS

**What's Implemented on Frontend**:
- ✅ Socket.io client integration structure
- ✅ Message cache system (500-message limit)
- ✅ Real-time room switching (instant due to cache)
- ✅ Message input component
- ✅ Chat conversation display
- ✅ Room list with active room indicator
- ✅ WebSocket connection status indicator (green/red dot)

**Backend APIs Needed** (from FRONTEND_READY.md):

#### Chat Room Endpoints:
1. **GET /api/chat/rooms**
   - Returns: Array of chat rooms for current user
   - Frontend uses: `useChatStore.fetchRooms()`

2. **POST /api/chat/rooms**
   - Create new chat room
   - Body: `{ participantIds: number[] }`
   - Frontend uses: `useChatStore.createRoom([userId])`

3. **PATCH /api/chat/rooms/:id/read**
   - Mark room messages as read
   - Frontend uses: Auto-called when room selected

4. **DELETE /api/chat/rooms/:id/leave**
   - Leave a chat room
   - Frontend uses: Room deletion

#### Message Endpoints:
1. **GET /api/chat/messages?roomId=X**
   - Returns: Last N messages for room
   - Frontend cache: Max 500 messages stored

2. **POST /api/chat/messages**
   - Send message
   - Body: `{ roomId: number, content: string }`
   - Frontend uses: `useChatStore.sendMessage(content)`

3. **PATCH /api/chat/messages/:id**
   - Edit message
   - Body: `{ content: string }`

4. **DELETE /api/chat/messages/:id**
   - Delete message

#### WebSocket Events (Socket.io):

**Client-to-Server**:
- `connection` - Client connects to WebSocket
- `room:join` - Join chat room
- `message:send` - Send message
- `room:leave` - Leave room

**Server-to-Client**:
- `message:new` - New message broadcast
- `message:update` - Message edited
- `message:delete` - Message deleted
- `user:typing` - User typing indicator (optional)
- `user:joined` - User joined room (optional)
- `user:left` - User left room (optional)

**Data Structure** (Frontend expects):
```typescript
interface Message {
  id: number
  roomId: number
  senderId: number
  content: string
  createdAt: string
  updatedAt: string
}

interface ChatRoom {
  id: number
  type: 0 | 1  // 0=private, 1=group
  title?: string
  participants: User[]
  createdAt: string
}
```

---

## 2. NOTIFICATIONS (Louis's Module)

### Frontend Readiness: ✅ READY

**Location**: `/frontend/src/stores/notifications.ts`

**What's Implemented on Frontend**:
- ✅ Toast notification system (Pinia store)
- ✅ Auto-dismiss after 3 seconds
- ✅ Max 3 concurrent notifications
- ✅ Notification UI components
- ✅ Type-safe notification methods (success, error, warning, info)

**Frontend API**:
```typescript
// From Pinia store - notifications.ts
const { success, error, warning, info } = useNotificationsStore()

// Usage examples:
success('Friend request sent', 3000)
error('Failed to send message', 3000)
warning('Connection lost', 0)  // No auto-dismiss
info('User is typing...', 5000)
```

**Backend Integration Options**:

### Option A: WebSocket Notifications (RECOMMENDED)
Use the same Socket.io connection as Chat:

```typescript
// Server sends notification events
socket.emit('notification:new', {
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  duration?: number // milliseconds
})

// Frontend receives and displays
socket.on('notification:new', (notification) => {
  notificationStore[notification.type](notification.message, notification.duration)
})
```

**When to Send Notifications**:
- Friend request received
- Friend request accepted
- Friend removed
- User blocked/unblocked
- Tournament registration confirmed
- Message from friend
- Match history updated
- System alerts

### Option B: HTTP Polling (NOT RECOMMENDED - DEPRECATED)
Would require periodic GET requests. Not recommended with WebSocket available.

---

## 3. MATCH HISTORY (Nicolas's Module)

### Frontend Readiness: ✅ READY

**Location**: `/frontend/src/pages/menu/MatchHistoryCard.vue`

**What's Implemented on Frontend**:
- ✅ Match history table display
- ✅ Filter by game type
- ✅ Pagination (10 matches per page)
- ✅ Win/loss stats calculation
- ✅ ELO rating display
- ✅ Accessible table with captions
- ✅ Color-coded results

**Current State**: Using mock data from `/frontend/src/data/mockMatchHistory.ts`

**Mock Data Structure**:
```typescript
interface MatchHistory {
  id: string
  gameType: string  // 'Chess', 'Dota2', 'Counter-Strike', etc.
  opponent: {
    id: number
    username: string
    rating: number
  }
  result: 'win' | 'loss'  // Result from user's perspective
  score: {
    userScore: number
    opponentScore: number
  }
  duration: string  // "42 min"
  date: string  // ISO date
  eloChange: number  // +15, -8, etc.
  gameLink?: string  // Optional: link to match on external site
}
```

**Backend APIs Needed**:

### 1. Get Match History
**Endpoint**: `GET /api/match-history`

**Query Parameters**:
- `userId`: number (optional, defaults to current user)
- `gameType`: string (optional, filter by game)
- `limit`: number (optional, default 10)
- `offset`: number (optional, default 0)

**Response**:
```json
{
  "matches": [
    {
      "id": "match-123",
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
      "gameLink": "https://chess.com/game/12345"
    }
  ],
  "total": 47,
  "page": 0,
  "limit": 10
}
```

### 2. Optional: Integration with External APIs

**Chess.com API** (if using chess.com for matches):
```typescript
// Backend fetches from chess.com and converts
GET https://api.chess.com/pub/player/{username}/games/2026/02
```

**Dota 2 API** (if using Steam):
```typescript
// OpenDota API
GET https://api.opendota.com/api/players/{steamId}/matches
```

### 3. Store Match Results
**Endpoint**: `POST /api/match-history`

**Body**:
```json
{
  "gameType": "Chess",
  "opponentId": 42,
  "result": "win",
  "score": {
    "userScore": 1,
    "opponentScore": 0
  },
  "gameLink": "https://chess.com/game/12345"
}
```

**Response**:
```json
{
  "id": "match-789",
  "message": "Match history recorded",
  "eloChange": 15
}
```

---

## Integration Checklist

### Ahmet (Chat/WebSocket)
- [ ] Implement 4 Chat REST endpoints (GET rooms, POST room, PATCH read, DELETE leave)
- [ ] Implement 4 Message REST endpoints (GET, POST, PATCH, DELETE)
- [ ] Setup Socket.io gateway with 5+ event handlers
- [ ] Test with frontend Socket.io client
- [ ] Verify message persistence and caching

### Louis (Notifications)
- [ ] Create WebSocket notification event handler
- [ ] Define notification emission points (see "When to Send Notifications" above)
- [ ] Test notifications trigger on frontend
- [ ] Verify 3-second auto-dismiss works
- [ ] Test with different notification types (success, error, warning, info)

### Nicolas (Match History)
- [ ] Create GET /api/match-history endpoint with filters
- [ ] Create POST /api/match-history endpoint to store results
- [ ] Optionally integrate chess.com API or OpenDota API
- [ ] Ensure ELO calculation is correct
- [ ] Test pagination with 10+ matches per page

---

## Testing the Integration

### Manual Testing Flow:
1. **Start App**: Open https://localhost:8443
2. **Login**: Use test credentials
3. **Test Chat**: Send message in chat, verify real-time delivery via WebSocket
4. **Test Notifications**: Trigger an action that sends notification, see toast appear
5. **Test Match History**: Verify matches display correctly, filters work, pagination works

### Automated Testing:
```bash
# From backend directory
npm test

# From frontend directory
npm test
```

---

## API Summary Table

| Module | Endpoint | Method | Status |
|--------|----------|--------|--------|
| Chat | /api/chat/rooms | GET | Not started |
| Chat | /api/chat/rooms | POST | Not started |
| Chat | /api/chat/rooms/:id/read | PATCH | Not started |
| Chat | /api/chat/rooms/:id/leave | DELETE | Not started |
| Chat | /api/chat/messages | GET | Not started |
| Chat | /api/chat/messages | POST | Not started |
| Chat | /api/chat/messages/:id | PATCH | Not started |
| Chat | /api/chat/messages/:id | DELETE | Not started |
| Notifications | WebSocket: notification:new | EVENT | Not started |
| Match History | /api/match-history | GET | Not started |
| Match History | /api/match-history | POST | Not started |

---

## Common Issues & Solutions

### WebSocket Connection Issues
**Problem**: Frontend can't connect to WebSocket
**Solution**: Ensure Socket.io server is listening on same port as backend (3000)
**Check**: Frontend logs will show connection attempt

### Message Ordering
**Problem**: Messages appear out of order
**Solution**: Sort by `createdAt` timestamp, not by ID
**Frontend expects**: Chronological order (oldest first)

### Notification Not Showing
**Problem**: WebSocket event sent but no notification appears
**Solution**: Check event name matches exactly (case-sensitive)
**Debug**: Check browser console for Socket.io errors

### Match History Empty
**Problem**: No matches display
**Solution**: Verify user has matches in database
**Debug**: Check API response in browser Network tab

---

## Questions or Issues?

- Check FRONTEND_READY.md for full context
- Read /docs/backend_architecture.md for API details
- Check frontend component code: `/frontend/src/stores/` and `/frontend/src/pages/`

---

**Document Generated**: 2026-02-08
**For**: Week 4 Backend Integration
**Status**: Frontend ready, waiting for backend APIs
