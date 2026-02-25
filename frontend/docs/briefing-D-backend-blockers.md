# Briefing D — Backend Blockers & What They Unlock

## The Big Picture

Your frontend is basically done (~19-21 corrector points built). But many features can't actually be *demonstrated* unless the backend is working. This briefing lists what each teammate needs to do, and what it unblocks for you.

---

## Nicolas — Backend (tournaments, teams, games, matches)

### Blocker N1: TeamsModule not imported in `app.module.ts`
**What's wrong:** Nicolas built the entire Teams module (controller, service, entities, commands, DTOs) but forgot to add `TeamsModule` to the imports in `app.module.ts`. All `/teams` endpoints return 404.
**Fix:** 2 lines of code:
```typescript
import { TeamsModule } from './modules/teams/teams.module';
// + add TeamsModule to the imports array
```
**Unlocks for you:**
- Tournament registration (create team, invite friends, lock team)
- Team invitations panel (accept/decline)
- Participants tab showing real teams

### Blocker N2: TournamentsModule also missing from `app.module.ts`
**What's wrong:** Same issue — `TournamentsModule` is not in the imports array. Only `GamesModule` was added.
**Fix:** Same pattern, 2 lines.
**Unlocks for you:**
- Tournament list page loading real data
- Tournament detail page
- Admin tournament creation

### Blocker N3: No match auto-generation
**What's wrong:** When a tournament starts, there's no code to create the bracket (matches). The `matches` table stays empty.
**Fix:** Nicolas needs to add a service method that, given locked teams, generates single-elimination bracket matches.
**Unlocks for you:**
- Bracket visualization with real data (currently shows mock/empty)
- Match results display

### Blocker N4: No tournament status transitions
**What's wrong:** No endpoint to move a tournament from REGISTRATION_OPEN to ONGOING to COMPLETED. Status is stuck at whatever it was created with.
**Fix:** Add `PATCH /tournaments/:id/status` or similar.
**Unlocks for you:**
- Tournament lifecycle demo (show a tournament going from registration to live to completed)
- Status badges working with real state

### Blocker N5: Match-Team entity bug
**What's wrong:** `Match.teams` references `team.match` but Team entity has no `match` property. Any query that loads matches with teams will crash.
**Fix:** Add the `match` relation to Team entity, or change the Match entity relation config.

### Blocker N6: `backend_nico` not merged to `main`
**What's wrong:** Nicolas's teams work (2 commits) is on `backend_nico` but not on `main`. The Docker setup uses `main`.
**Fix:** Nicolas merges `backend_nico` → `main`.

---

## Louis — Backend (auth, permissions, notifications)

### Blocker L1: `permissions` branch not merged to `main`
**What's wrong:** Louis's admin invite system and token generator are on `origin/permissions` but not merged. The RBAC admin features (invite users, manage roles) won't work without this.
**Fix:** Louis merges `permissions` → `main`.
**Unlocks for you:**
- Admin invite system (generate invite links, manage user roles)
- RBAC enforcement on backend (currently frontend-only guards)

### Blocker L2: `/users/me` missing role/status/avatarUrl
**What's wrong:** The `GET /users/me` endpoint doesn't return the user's role, online status, or avatar URL. Frontend has a temporary workaround that patches these in.
**Fix:** Louis (or Nicolas) updates the users controller to include these fields in the response.
**Unlocks for you:**
- Remove the frontend workaround hack
- Role-based UI working with real data (admin badge, permission checks)
- Avatar display, online status indicators

---

## Ahmet — DevOps/Backend (Docker, WebSocket)

### Blocker A1: `amt` branch is destructive
**What's wrong:** Ahmet's branch deletes ~20,000 lines of frontend code. It's 2 weeks old (last commit Feb 11). It removes stores, components, tests — basically everything you built.
**Action:** Do NOT merge `amt` into any branch that has your frontend work. If Ahmet has useful backend/Docker changes, cherry-pick only the backend files.

### Blocker A2: Docker/Nginx setup status unknown
**What's wrong:** We don't know if `make up` (Docker Compose) actually works with the current `main` branch. Ahmet was responsible for Docker/Nginx but hasn't been active.
**Action:** Someone needs to test `make up` and fix any Docker issues. This is critical — the corrector's first action is `make up`.
**Unlocks for you:**
- The entire demo working at all (corrector opens https://localhost)

---

## Summary: What to message each person

### Message to Nicolas (URGENT):
> "Hey Nicolas, 2 quick fixes needed on backend_nico:
> 1. Add `TeamsModule` to imports in `app.module.ts` (it's not registered, so all /teams endpoints 404)
> 2. Add `TournamentsModule` to imports too (same issue)
> 3. Then merge backend_nico → main
> This unblocks the entire tournament + team registration flow on frontend."

### Message to Louis:
> "Hey Louis, can you merge the `permissions` branch to `main`? The admin invite system and role enforcement are ready but not on main. Also, can you add `role`, `status`, and `avatarUrl` to the GET /users/me response? Frontend has a workaround but it should come from backend."

### Message to Ahmet:
> "Hey Ahmet, can you check if `make up` works on the current `main` branch? The corrector will run this first. Also heads up — please don't merge your `amt` branch into main, it would delete the frontend. If you have Docker/Nginx fixes, let's cherry-pick just those files."
