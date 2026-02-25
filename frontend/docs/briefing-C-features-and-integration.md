# Briefing C — Integration Testing & Feature Status

## Status as of Feb 25 (evening) — UPDATED

---

## Part 1: What are "auth, chat, tournament flows" and how would we test them?

### Auth Flow (what it does)
When you open the app, you either log in or sign up. The app sends your email/password to the backend, gets a token back, and stores it. Every future request uses that token to prove who you are. If you enabled 2FA, you also type a 6-digit code from your phone. Google OAuth lets you skip the password entirely.

**How we'd test it:**
1. Start Docker (`make up`) — this boots the backend + database
2. Open https://localhost in browser
3. Sign up with a new account → check that it works
4. Log out, log back in → check token is remembered
5. Enable 2FA → log out → log back in → check 2FA prompt appears
6. Try Google OAuth login
7. Try accessing a protected page while logged out → should redirect to login

**What could go wrong:** Backend not starting, database not initialized, CORS errors, SSL certificate issues, Google OAuth redirect misconfigured.

**Current status:** Louis merged `simon/frontend` into `test_merge_perm_+_front` (see Briefing D). `/users/me` now returns `role` and `status` properly. Auth should work end-to-end once Docker is tested.

---

### Chat Flow (what it does)
Two users can send messages to each other in real-time. Messages appear instantly (via WebSocket, not page refresh). You can also block users, see typing indicators, and get read receipts.

**How we'd test it:**
1. Open app in 2 browser tabs, logged in as 2 different users
2. User A sends a message to User B → check it appears in real-time
3. User B types → check typing indicator shows for User A
4. User B reads message → check read receipt updates for User A
5. User A blocks User B → check User B can't send messages anymore

**What could go wrong:** WebSocket connection failing, messages not persisted to database, blocking not enforced on backend.

**Current status:** Chat module is complete on backend (was on main since earlier). WebSocket store is fully implemented. Should work once Docker is tested.

---

### Tournament Flow (what it does)
An admin creates a tournament for a specific game (like Pong). Players browse tournaments and register. For team games, you create a team, invite friends, and lock your roster. When all teams are ready, the tournament starts and a bracket is generated.

**How we'd test it:**
1. Log in as admin → create a game (Pong, 2 players, 1v1)
2. Create a tournament for that game
3. Log in as Player A → register (auto-creates solo team, auto-locks)
4. Log in as Player B → register
5. Admin starts tournament → bracket should generate
6. Check bracket visualization shows both players

**What could go wrong:** TeamsModule not imported (Blocker N1 — still open), TournamentsModule not imported (Blocker N2 — still open), match generation not implemented (Blocker N3 — still open).

---

## Part 2: Feature status

### 1. Team Management Page
**Status:** No standalone "My Teams" page — and that's fine.
Teams are managed inline: registration modal (create+invite), `TeamInvitationsPanel` (accept/decline).
**Verdict: SKIP — not needed for corrector points.**

---

### 2. Game Admin CRUD

**Status:** `CreateTournamentTab.vue` fetches games with `gamesApi.getAll()` and shows them as selectable grid. No "create game" UI yet.

**Risk:** If the database starts empty, admin can't create tournaments. Needs either:
- A simple "Add Game" button in admin panel (15 min of work) — **recommended**
- Or ask Nicolas for a database seed script

**Verdict: Add the "Add Game" button — quick win, unblocks the demo.**
`POST /games` endpoint is already implemented on `backend_nico`.

---

### 3. Match Result Display

**Status: Already built.** `BracketVisualization.vue` shows:
- Match scores (`score1` / `score2`)
- Winner highlighting
- Match status badges (completed / live / upcoming)
- Champion banner

**Verdict: No frontend work needed. Waiting on N3 + N5 (Nicolas).**

---

### 4. Tournament Status Badges

**Status: Already built.** `TournamentCard.vue`, `TournamentFilters.vue`, `TournamentDetailCard.vue` all display and filter by status.

**Verdict: No frontend work needed. Waiting on N4 (Nicolas) for lifecycle transitions.**

---

## Summary Table

| Feature | Built? | Needed for points? | Blocked by backend? | Action |
|---------|--------|-------------------|---------------------|--------|
| Team Management Page | No | No | Partially (N1) | Skip |
| Game Admin CRUD (create) | Partial (read-only) | Yes | No (POST /games works) | **Add "Add Game" button** |
| Match Result Display | **Yes** | Yes | Yes (N3, N5) | No frontend work |
| Tournament Status | **Yes** | Yes | Yes (N4) | No frontend work |

## Bottom Line

Only 1 remaining frontend task from Option C: **Add "Add Game" form** to admin panel.
Everything else is built — it's all waiting on backend blockers.
