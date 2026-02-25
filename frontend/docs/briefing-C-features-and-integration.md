# Briefing C — Integration Testing & Feature Status

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

### Chat Flow (what it does)
Two users can send messages to each other in real-time. Messages appear instantly (via WebSocket, not page refresh). You can also block users, see typing indicators, and get read receipts.

**How we'd test it:**
1. Open app in 2 browser tabs, logged in as 2 different users
2. User A sends a message to User B → check it appears in real-time
3. User B types → check typing indicator shows for User A
4. User B reads message → check read receipt updates for User A
5. User A blocks User B → check User B can't send messages anymore

**What could go wrong:** WebSocket connection failing, messages not persisted to database, blocking not enforced on backend.

### Tournament Flow (what it does)
An admin creates a tournament for a specific game (like Pong). Players browse tournaments and register. For team games, you create a team, invite friends, and lock your roster. When all teams are ready, the tournament starts and a bracket is generated.

**How we'd test it:**
1. Log in as admin → create a game (Pong, 2 players, 1v1)
2. Create a tournament for that game
3. Log in as Player A → register (auto-creates solo team, auto-locks)
4. Log in as Player B → register
5. Admin starts tournament → bracket should generate
6. Check bracket visualization shows both players

**What could go wrong:** TeamsModule not imported (known blocker), match generation not implemented (known blocker), tournament status transitions missing.

---

## Part 2: The four Option C features — are they necessary?

### 1. Team Management Page

**What it would be:** A dedicated page at `/menu/teams` where you see all your teams across all tournaments. You could view members, leave a team, or see your pending invitations.

**Current status:** There is NO standalone "My Teams" page. Teams are managed inline:
- During tournament registration (create team + invite)
- In `TeamInvitationsPanel` (accept/decline invitations)
- In the organization system (separate concept, already implemented)

**Is it necessary?**
**No.** The corrector checks for tournament registration and team functionality, not for a dedicated team management page. The inline flows (register → create team → invite) cover what's needed. The `TeamInvitationsPanel` handles the accept/decline flow.

**Blocked by backend?** Partially — needs TeamsModule imported (Blocker N1).

---

### 2. Game Admin CRUD

**What it would be:** An admin panel where you can create, edit, and delete games (e.g., "Pong — 2 teams of 1", "League of Legends — 2 teams of 5"). Currently the admin can only *select* from existing games when creating a tournament.

**Current status:** `CreateTournamentTab.vue` fetches games with `gamesApi.getAll()` and shows them as selectable cards. But there's no UI to *create* a new game. Games would need to be added via the backend directly (API call or database seed).

**Is it necessary?**
**Somewhat.** If the database starts empty, the admin can't create tournaments because there are no games to pick. You need at least a seed script or a quick "add game" form. But a full CRUD (edit, delete) is overkill.

**Quick alternative:** Ask Nicolas to add a database seed that creates 3-4 default games (Pong, Chess, League of Legends). Then you don't need a game CRUD UI at all. Or I add a simple "Add Game" button to the admin panel (15 minutes of work).

**Blocked by backend?** No — `POST /games` endpoint already works on `backend_nico`.

---

### 3. Match Result Display

**What it would be:** After a match is played, showing who won, the scores, and updating the bracket accordingly.

**Current status: Already implemented.** `BracketVisualization.vue` already displays:
- Match scores (`score1` / `score2`)
- Winner highlighting (CSS class on the winning team)
- Match status badges (completed / live / upcoming)
- Champion banner for the tournament winner

**Is it necessary?**
**It's already done.** No work needed on the frontend side.

**Blocked by backend?** Yes — there's no match auto-generation (Blocker N3) and no endpoint to record match results (Blocker N5). So the bracket will show empty even though the visualization code is ready.

---

### 4. Tournament Status

**What it would be:** Showing whether a tournament is in REGISTRATION_OPEN, ONGOING, or COMPLETED state, with visual badges and filters.

**Current status: Already implemented.** Multiple components display tournament status:
- `TournamentCard.vue` — status badge with color coding
- `TournamentFilters.vue` — filter tournaments by status
- `TournamentDetailCard.vue` — status shown in overview tab
- CSS classes: `status-draft`, `status-registration-open`, `status-ongoing`, `status-completed`

**Is it necessary?**
**It's already done.** No work needed.

**Blocked by backend?** Yes — no endpoint to *change* a tournament's status (Blocker N4). So all tournaments will stay at whatever status they were created with. The frontend visualization works, but you can't demo the lifecycle.

---

## Summary Table

| Feature | Built? | Needed for points? | Blocked by backend? | Action |
|---------|--------|-------------------|---------------------|--------|
| Team Management Page | No | No | Partially (N1) | Skip — inline flows are enough |
| Game Admin CRUD | No (read-only) | Somewhat | No | Add simple "Add Game" button OR ask Nicolas for DB seed |
| Match Result Display | **Yes** | Yes | Yes (N3, N5) | No frontend work — waiting on Nicolas |
| Tournament Status | **Yes** | Yes | Yes (N4) | No frontend work — waiting on Nicolas |

## Bottom Line

**2 of the 4 features are already built** (match results, tournament status). The team management page isn't needed. The only useful work in Option C is adding a small "Add Game" form — which takes 15 minutes.

Your time is better spent on **Option D** (unblocking the backend) and then **testing the real flows** once Nicolas and Louis merge their work.
