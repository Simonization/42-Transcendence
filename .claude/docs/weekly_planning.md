# Weekly Planning - esportendence

## Timeline Overview

| Week | Dates | Focus | Key Deliverables |
|------|-------|-------|------------------|
| 1 | Jan 19-25 | Foundation | Docker setup, NestJS scaffold, Vue scaffold, DB schema, Auth started |
| 2 | Jan 26 - Feb 1 | Core Auth + Structure | User registration/login, profile, Google OAuth, Permission roles |
| 3 | Feb 2-8 | Tournament Core + Social | Tournament creation, bracket logic, friend system, basic chat |
| 4 | Feb 9-15 | Real-time + Polish | WebSocket chat, notifications, advanced chat features, 2FA |
| 5 | Feb 16-22 | Search + I18n + Design | Advanced search, translations, design system components, match result flow |
| 6 | Feb 23 - Mar 1 | Buffer + Polish | Bug fixes, browser testing, documentation, dry-run evaluations |

**Note:** Riot OAuth will not be implemented. Google OAuth is used instead.

---

## Status Tracking

### Week 1 (Jan 19-25) - Foundation ✅

| Task | Status | Notes |
|------|--------|-------|
| Docker setup | ✅ Done | docker-compose with nginx, backend, frontend, db, pgadmin |
| NestJS scaffold | ✅ Done | Originally planned Django, switched to NestJS |
| Vue scaffold | ✅ Done | Vue 3 + Vite + Vue Router |
| DB schema | ✅ Done | TypeORM entities for User, Profile, Settings, Chat, Friends |
| Auth started | ✅ Done | JWT + Passport implemented |

---

### Week 2 (Jan 26 - Feb 1) - Core Auth + Structure ✅

| Task | Status | Notes |
|------|--------|-------|
| User registration | ✅ Done | With email verification |
| User login | ✅ Done | JWT access + refresh tokens |
| Profile | ✅ Done | UserProfile entity + endpoints |
| Google OAuth | ✅ Done | Replaces Riot OAuth |
| ~~OAuth Riot~~ | ❌ Cancelled | Not implementing |
| ~~Organization CRUD~~ | ❌ Skipped | Not in current scope |
| Permission roles | ⚠️ Partial | User.role field exists, no RBAC enforcement yet |

---

### Week 3 (Feb 2-8) - Tournament Core + Social 🔄 IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Enable FriendsModule | ⏳ Todo | Backend exists, needs import in app.module.ts |
| Enable ChatModule | ⏳ Todo | Backend exists, needs import in app.module.ts |
| Friends frontend UI | ⏳ Todo | List, add/remove, requests, block/unblock |
| Chat frontend UI | ⏳ Todo | Room list, message input, send functionality |
| Tournament creation | ⏳ Todo | Backend module not started |
| Bracket logic | ⏳ Todo | Single/double elimination |

**Priority tasks for this week:**

1. **Backend: Import modules**
   ```typescript
   // backend/src/app.module.ts
   import { FriendsModule } from './modules/friends/friends.module';
   import { ChatModule } from './modules/chat/chat.module';
   ```

2. **Frontend: Friends UI**
   - `/src/pages/Friends.vue`
   - `/src/components/friends/FriendsList.vue`
   - `/src/components/friends/FriendRequests.vue`
   - `/src/components/friends/BlockedUsers.vue`
   - `/src/api/friends.ts`

3. **Frontend: Chat UI**
   - `/src/pages/Chat.vue`
   - `/src/components/chat/ChatSidebar.vue`
   - `/src/components/chat/ChatWindow.vue`
   - `/src/components/chat/MessageInput.vue`
   - `/src/api/chat.ts`
   - `/src/composables/useChat.ts`

4. **Backend: Tournament module**
   - Tournament entity
   - Tournament CRUD endpoints
   - Bracket generation logic

---

### Week 4 (Feb 9-15) - Real-time + Polish

| Task | Status | Notes |
|------|--------|-------|
| WebSocket chat | ⚠️ Partial | ChatGateway exists, needs enhancement |
| Notifications | ⏳ Todo | Not started |
| Advanced chat features | ⚠️ Partial | Edit/delete messages exist |
| 2FA | ✅ Done | Completed early (email-based) |

---

### Week 5 (Feb 16-22) - Search + I18n + Design

| Task | Status | Notes |
|------|--------|-------|
| Advanced search | ⏳ Todo | Not started |
| Translations (i18n) | ⏳ Todo | Language field exists, no i18n system |
| Design system components | ⏳ Todo | Currently vanilla CSS |
| Match result flow | ⏳ Todo | Depends on tournament module |

---

### Week 6 (Feb 23 - Mar 1) - Buffer + Polish

| Task | Status | Notes |
|------|--------|-------|
| Bug fixes | ⏳ Todo | - |
| Browser testing | ⏳ Todo | - |
| Documentation | ⏳ Todo | backend_architecture.md and frontend_dev.md created |
| Dry-run evaluations | ⏳ Todo | - |

---

## Technical Debt / Improvements Needed

| Item | Priority | Description |
|------|----------|-------------|
| API service layer | High | Frontend uses scattered fetch calls, needs centralized API |
| Token refresh | High | Refresh tokens exist but no auto-refresh mechanism |
| TypeScript types | Medium | Frontend has loose typing |
| Error handling | Medium | No toast/notification system |
| Profile/Settings pages | Medium | Backend exists, frontend missing |
| WebSocket security | Medium | Currently CORS: '*', needs restriction |

---

## Module Import Status

| Backend Module | Imported in app.module.ts | Endpoints Accessible |
|----------------|---------------------------|---------------------|
| AuthModule | ✅ Yes | ✅ Yes |
| UsersModule | ✅ Yes | ✅ Yes |
| MailModule | ✅ Yes | N/A (internal) |
| FriendsModule | ❌ No | ❌ No |
| ChatModule | ❌ No | ❌ No |

---

## API Endpoints Summary

See `backend_architecture.md` for full API documentation.

**Active endpoints:** 16
- Auth: 11 endpoints
- Users: 5 endpoints

**Inactive (needs module import):** 14
- Friends/Social: 6 endpoints
- Chat: 8 endpoints
