# Sprint Plan — Final Week (Feb 24–28, 2026)

## Updated: Feb 26 (after main pull + latest frontend pushes)

---

## Current Scores (Corrector.md)

**23 points / 14 required — 9pt buffer**

| Module | Pts | Status |
|--------|-----|--------|
| Vue 3 + NestJS | 2 | ✅ Done |
| Socket.io WebSockets | 2 | ✅ Done |
| Chat + Profiles + Friends | 2 | ✅ Done |
| ORM (TypeORM + PostgreSQL) | 1 | ✅ Done (BE) |
| Notification toast system | 1 | ✅ Done |
| Custom design system (19+ components) | 1 | ✅ Done |
| Advanced search (filters, sort, pagination) | 1 | ✅ Done |
| Standard auth (+ Google OAuth + 2FA) | 4 | ✅ Done |
| Advanced permissions (RBAC) | 2 | ✅ Done |
| i18n (EN/FR/TR) | 1 | ✅ Done |
| Browser support (Firefox + Safari) | 1 | ✅ Done |
| Advanced chat features (block, typing, receipts) | 1 | ✅ Done |
| Match history (chess.com API) | 1 | ✅ Done |
| Tournament tracking (8 components) | 1 | ✅ Done |
| Organization/team system | 2 | ✅ Done |

---

## What Was Done Since Last Sprint

### Pulled from main (via 9ada8c1 merge):
- Backend: tournament module, game module, matches queries from `backend_nico`
- Docs: backend architecture doc removed (outdated)

### Latest pushes to simon/frontend:
- `cca13fe` Add inline Create Game form to admin panel (unblocks empty DB scenario)
- `9043f4e` Remove outdated docs (stale sprint plans, old test counts, broken paths)

---

## Remaining Frontend Tasks

### HIGH — UX gaps visible to corrector

**1. FriendList "Chat" button** ❌ Missing
- `FriendList.vue` has Remove + Block but no "Chat" button
- A corrector will try to message a friend from the friends list and find no way
- **Fix**: Emit `chat` event → FriendCard navigates to `/menu/chat?openWith=<id>`
- **ChatCard**: On mount, check `route.query.openWith`, auto-open DM

**2. SearchModal user results are dead** ❌ Missing
- Users tab shows results but nothing happens on click
- `selectUser` event not emitted, not handled in MenuLayout
- **Fix**: Add `@click="emit('selectUser', f.id)"` on user rows
- **MenuLayout**: Handle `@select-user` → navigate to `/menu/chat?openWith=<id>`

**3. New chat form uses numeric user ID** ⚠️ Bad UX
- ChatCard `+` button prompts for a user ID (a number)
- No normal user knows their friend's numeric ID
- **Fix**: Replace with username search typeahead using `usersApi.search()`

### MEDIUM — Correctness / polish

**4. CLAUDE.md module table** ⚠️ Stale
- Still says "advanced search: Partial" and "advanced chat: Planned"
- Fix: Update table to match Corrector.md (both Done)

**5. TypeScript check**
- Run `vue-tsc --noEmit` to verify no type errors before demo day

### LOW — Dependent on backend team

**6. Backend blockers (Nicolas)**
- N1: `TeamsModule` not in `app.module.ts` → all /teams endpoints 404
- N2: `TournamentsModule` not in `app.module.ts` → tournament flow broken
- N3: No match auto-generation
- N4: No tournament status transitions
- N5: Match-Team entity relation bug

**7. Merge pipeline**
- `test_merge_perm_+_front` → `main` (Louis to execute when N1+N2 fixed)

**8. Docker e2e test (Ahmet)**
- `make up` not tested on merged main — critical for corrector Day 1

---

## Saturday Feb 28 — Testing Day

**Location:** 42 Brussels school
**Browsers:** Chrome + Firefox + Safari
**Flows to test:**
1. Auth: register → login → 2FA → Google OAuth
2. Chat: DM → typing indicator → block user → read receipts
3. Friends: add → accept → message (via "Chat" button)
4. Tournament: create game → create tournament → register → bracket
5. Organizations: create org → invite members → manage
6. Search: find users → find tournaments → filter
7. Admin: manage users → RBAC → invite admin

**Risk:** Tournament flow depends on N1+N2 being fixed before Saturday.

---

## Notes on Architecture

- **Advanced search**: Real API calls (`tournamentsApi.getAll()`, `usersApi.search()`), client-side filtering after fetch — this is fine and standard
- **Advanced chat**: typing indicators via WS, block via friendsApi, read receipts via markAsRead — complete
- **The `simon/frontend` temp workaround**: `backend/users.service.ts` patch still live — will be superseded by permissions branch merge
